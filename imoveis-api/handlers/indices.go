package handlers

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"imoveis-api/database"
	"imoveis-api/models"

	"github.com/PuerkitoBio/goquery"
	"github.com/gofiber/fiber/v2"
)

const urlIGPM = "https://paineldeindices.com.br/indice/igpm/"

// GET /api/indices - retorna IPCA acumulado 12, IGPM acumulado 12 e IGPM mês anterior
func GetIndices(c *fiber.Ctx) error {
	var res struct {
		IPCAAcumulado12   float64 `json:"ipcaAcumulado12"`
		IGPMAcumulado12   float64 `json:"igpmAcumulado12"`
		IGPMMesAnterior   float64 `json:"igpmMesAnterior"`
		UltimaAtualizacao string  `json:"ultimaAtualizacao,omitempty"`
	}
	// Lê do resumo (tabela indice_resumos)
	var rows []models.IndiceResumo
	if result := database.DB.Find(&rows); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao buscar índices"})
	}
	for _, r := range rows {
		switch r.Chave {
		case "ipca_acumulado_12":
			res.IPCAAcumulado12 = r.Valor
		case "igpm_acumulado_12":
			res.IGPMAcumulado12 = r.Valor
		case "igpm_mes_anterior":
			res.IGPMMesAnterior = r.Valor
		}
	}
	// Data da última atualização (pega a mais recente entre as chaves)
	for _, r := range rows {
		if r.UpdatedAt.IsZero() == false {
			res.UltimaAtualizacao = r.UpdatedAt.Format("02/01/2006 15:04")
			break
		}
	}
	return c.JSON(res)
}

// POST /api/indices/atualizar - faz scrape da página IGPM e salva (admin)
func AtualizarIndices(c *fiber.Ctx) error {
	igpmMesAnterior, igpmAcumulado12, mensais, err := scrapeIGPM()
	if err != nil {
		log.Printf("scrape IGPM: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Falha ao obter dados do IGPM: " + err.Error()})
	}
	now := time.Now()
	// Salva resumo
	saveResumo("igpm_mes_anterior", igpmMesAnterior, now)
	saveResumo("igpm_acumulado_12", igpmAcumulado12, now)
	// IPCA: por enquanto mantém 0 ou valor já existente; pode integrar outra fonte depois
	// saveResumo("ipca_acumulado_12", 0, now)
	// Salva valores mensais (tabela)
	for _, m := range mensais {
		var ind models.IndiceMensal
		database.DB.Where("tipo = ? AND ano = ? AND mes = ?", "igpm", m.Ano, m.Mes).FirstOrInit(&ind)
		ind.Tipo = "igpm"
		ind.Ano = m.Ano
		ind.Mes = m.Mes
		ind.Valor = m.Valor
		database.DB.Save(&ind)
	}
	return c.JSON(fiber.Map{
		"message":         "Índices atualizados",
		"igpmMesAnterior": igpmMesAnterior,
		"igpmAcumulado12": igpmAcumulado12,
		"mesesSalvos":     len(mensais),
	})
}

func saveResumo(chave string, valor float64, t time.Time) {
	var r models.IndiceResumo
	database.DB.Where("chave = ?", chave).FirstOrInit(&r)
	r.Chave = chave
	r.Valor = valor
	r.UpdatedAt = t
	database.DB.Save(&r)
}

// scrapeIGPM acessa a página e extrai os cards (lógica igual ao código Node com cheerio)
func scrapeIGPM() (mesAnterior, acumulado12 float64, mensais []struct {
	Ano, Mes int
	Valor    float64
}, err error) {
	client := &http.Client{Timeout: 15 * time.Second}
	req, _ := http.NewRequest("GET", urlIGPM, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	resp, err := client.Do(req)
	if err != nil {
		return 0, 0, nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, 0, nil, errors.New("status não OK")
	}
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return 0, 0, nil, err
	}
	var indices []float64
	doc.Find("p.card-indice-numero.text-center").Each(func(_ int, sel *goquery.Selection) {
		text := strings.TrimSpace(sel.Text())
		text = strings.ReplaceAll(text, ",", ".")
		text = strings.TrimSpace(strings.TrimSuffix(text, "%"))
		text = strings.ReplaceAll(text, "\u2212", "-") // hífen unicode
		if v, e := strconv.ParseFloat(text, 64); e == nil {
			indices = append(indices, v)
		}
	})
	// Ordem na página: [0]=valor último mês (ex: 12/2025 = -0,01), [1]=acumulado últimos 12 meses (-1,04), [2]=outro (ex: neste ano)
	mesAnterior = 0
	if len(indices) >= 1 {
		mesAnterior = indices[0]
	}
	if len(indices) >= 2 {
		acumulado12 = indices[1]
	}
	// Tabela: extrair ano e mês da coluna Data (ex: 01/01/2025) e valor da coluna Valor; salvar só o que existe na página
	parseRow := func(row *goquery.Selection) {
		tds := row.Find("td")
		if tds.Length() < 3 {
			return
		}
		valText := strings.TrimSpace(tds.Eq(2).Text())
		valText = strings.ReplaceAll(valText, ",", ".")
		valText = strings.TrimSpace(strings.TrimSuffix(valText, "%"))
		valText = strings.ReplaceAll(valText, "\u2212", "-")
		v, errV := strconv.ParseFloat(valText, 64)
		if errV != nil {
			return
		}
		// Coluna Data = 2ª (índice 1), formato 01/01/2025 ou 01/12/2025
		dataStr := strings.TrimSpace(tds.Eq(1).Text())
		parts := strings.Split(dataStr, "/")
		if len(parts) != 3 {
			return
		}
		dia, _ := strconv.Atoi(strings.TrimSpace(parts[0]))
		mesNum, _ := strconv.Atoi(strings.TrimSpace(parts[1]))
		ano, _ := strconv.Atoi(strings.TrimSpace(parts[2]))
		if dia < 1 || mesNum < 1 || mesNum > 12 || ano < 2000 || ano > 2100 {
			return
		}
		mensais = append(mensais, struct {
			Ano, Mes int
			Valor    float64
		}{ano, mesNum, v})
	}
	doc.Find("table tbody tr").Each(func(_ int, row *goquery.Selection) {
		parseRow(row)
	})
	if len(mensais) == 0 {
		doc.Find("table tr").Each(func(_ int, row *goquery.Selection) {
			parseRow(row)
		})
	}
	return mesAnterior, acumulado12, mensais, nil
}
