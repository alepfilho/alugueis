package handlers

import (
	"encoding/json"
	"fmt"
	"imoveis-api/database"
	"imoveis-api/models"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
)

// CriarImovel - Adiciona um novo imóvel
func CriarImovel(c *fiber.Ctx) error {
	// Verifica o Content-Type para determinar se é multipart/form-data ou JSON
	contentType := c.Get("Content-Type")
	isMultipart := len(contentType) > 0 && len(contentType) >= 19 && contentType[:19] == "multipart/form-data"

	// Processa o arquivo PDF se fornecido (apenas em multipart)
	// Salva temporariamente para mover depois que tivermos os IDs
	var arquivoTemporario string
	var nomeArquivoOriginal string
	if isMultipart {
		file, err := c.FormFile("arquivoContrato")
		if err == nil && file != nil {
			// Valida se é PDF
			if filepath.Ext(file.Filename) != ".pdf" {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "O arquivo deve ser um PDF"})
			}

			// Cria diretório temporário se não existir
			tempDir := "assets/temp"
			if err := os.MkdirAll(tempDir, os.ModePerm); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criar diretório temporário"})
			}

			// Gera nome único temporário para o arquivo
			timestamp := time.Now().Unix()
			nomeArquivoOriginal = file.Filename
			nomeTemp := fmt.Sprintf("%d_%s", timestamp, file.Filename)
			arquivoTemporario = filepath.Join(tempDir, nomeTemp)

			// Salva o arquivo temporariamente
			if err := c.SaveFile(file, arquivoTemporario); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao salvar arquivo temporário"})
			}
		}
	}

	var imovel models.Imovel
	var locatarioIdUint *uint

	if isMultipart {
		// Processa dados do multipart/form-data
		endereco := c.FormValue("endereco")
		valorAluguelStr := c.FormValue("valorAluguel")
		valorCondominioStr := c.FormValue("valorCondominio")
		valorIptuStr := c.FormValue("valorIptu")
		valorCaucaoStr := c.FormValue("valorCaucao")
		dataInicioContratoStr := c.FormValue("dataInicioContrato")
		locatarioIdStr := c.FormValue("locatarioId")

		// Converte valores numéricos
		var valorAluguel, valorCondominio, valorIptu, valorCaucao float64
		fmt.Sscanf(valorAluguelStr, "%f", &valorAluguel)
		fmt.Sscanf(valorCondominioStr, "%f", &valorCondominio)
		fmt.Sscanf(valorIptuStr, "%f", &valorIptu)
		fmt.Sscanf(valorCaucaoStr, "%f", &valorCaucao)

		// Converte data
		dataInicioContrato, err := time.Parse("2006-01-02T15:04:05Z", dataInicioContratoStr)
		if err != nil {
			// Tenta outro formato
			dataInicioContrato, err = time.Parse("2006-01-02", dataInicioContratoStr)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Formato de data inválido"})
			}
		}

		// Converte locatarioId
		if locatarioIdStr != "" {
			var locIdUint uint
			fmt.Sscanf(locatarioIdStr, "%d", &locIdUint)
			if locIdUint > 0 {
				locatarioIdUint = &locIdUint
			}
		}

		imovel = models.Imovel{
			Endereco:           endereco,
			ValorAluguel:       valorAluguel,
			ValorCondominio:    valorCondominio,
			ValorIptu:          valorIptu,
			ValorCaucao:        valorCaucao,
			DataInicioContrato: dataInicioContrato,
			ArquivoContrato:    "", // Será preenchido depois com o caminho correto
		}
	} else {
		// Tenta parsear como JSON
		body := make(map[string]interface{})
		if err := json.Unmarshal(c.Body(), &body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
		}

		// Extrai locatarioId se presente
		var locatarioId interface{}
		if locId, ok := body["locatarioId"]; ok && locId != nil {
			locatarioId = locId
			delete(body, "locatarioId")
		}

		// Converte locatarioId para uint se presente
		if locatarioId != nil {
			var locIdUint uint
			if locIdFloat, ok := locatarioId.(float64); ok {
				if locIdFloat < 0 {
					return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "locatarioId deve ser um número positivo"})
				}
				locIdUint = uint(locIdFloat)
			} else if locIdInt, ok := locatarioId.(int); ok {
				if locIdInt < 0 {
					return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "locatarioId deve ser um número positivo"})
				}
				locIdUint = uint(locIdInt)
			} else {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "locatarioId deve ser um número"})
			}
			locatarioIdUint = &locIdUint
		}

		// Faz parse do body (sem locatarioId) para o modelo Imovel
		bodyBytes, _ := json.Marshal(body)
		if err := json.Unmarshal(bodyBytes, &imovel); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
		}

		// Se arquivo foi enviado via JSON (string), mantém como está
		// O caminho já está no campo ArquivoContrato do JSON
	}

	// Se foi fornecido um locatarioId, valida e seta o InquilinoID antes de criar (cliente só pode vincular inquilino próprio)
	if locatarioIdUint != nil {
		var inquilino models.Inquilino
		if result := database.DB.First(&inquilino, *locatarioIdUint); result.Error != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquilino não encontrado"})
		}
		if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
			if uid, ok := c.Locals("user_id").(uint); ok && (inquilino.UserID == nil || *inquilino.UserID != uid) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquilino não encontrado"})
			}
		}
		imovel.InquilinoID = locatarioIdUint
	}

	// Se o usuário logado for cliente, vincula o imóvel a ele (para desativação em cascata)
	if uid, ok := c.Locals("user_id").(uint); ok {
		if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
			imovel.UserID = &uid
		}
	}
	// Cria o imóvel (já com InquilinoID se fornecido)
	if result := database.DB.Create(&imovel); result.Error != nil {
		// Se falhar, remove arquivo temporário se existir
		if arquivoTemporario != "" {
			os.Remove(arquivoTemporario)
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criar imóvel"})
	}

	// Se foi fornecido um locatarioId, atualiza o inquilino com o id deste imóvel (e desvincula do imóvel anterior, se houver)
	if locatarioIdUint != nil {
		var inquilino models.Inquilino
		if result := database.DB.First(&inquilino, *locatarioIdUint); result.Error != nil {
			if arquivoTemporario != "" {
				os.Remove(arquivoTemporario)
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao buscar inquilino após criação"})
		}
		// Se o inquilino estava em outro imóvel, desvincula esse imóvel
		if inquilino.ImovelID != nil && *inquilino.ImovelID > 0 {
			database.DB.Model(&models.Imovel{}).Where("id = ?", *inquilino.ImovelID).Update("inquilino_id", nil)
		}
		// Atualiza o inquilino com o id deste imóvel (tabela inquilinos passa a ter imovel_id preenchido)
		inquilino.ImovelID = &imovel.ID
		if result := database.DB.Save(&inquilino); result.Error != nil {
			if arquivoTemporario != "" {
				os.Remove(arquivoTemporario)
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao associar inquilino ao imóvel"})
		}
	}

	// Se há arquivo temporário, move para a estrutura correta
	if arquivoTemporario != "" {
		// Determina o ID do inquilino (pode ser nil se não houver)
		inquilinoID := uint(0)
		if imovel.InquilinoID != nil {
			inquilinoID = *imovel.InquilinoID
		}

		// Cria a estrutura de pastas: assets/imoveis/{imovel_id}/{inquilino_id}/
		uploadDir := fmt.Sprintf("assets/imoveis/%d/%d", imovel.ID, inquilinoID)
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			// Se falhar ao criar diretório, remove arquivo temporário
			os.Remove(arquivoTemporario)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criar diretório de upload"})
		}

		// Define o caminho final do arquivo
		caminhoFinal := filepath.Join(uploadDir, nomeArquivoOriginal)

		// Move o arquivo do diretório temporário para o diretório final
		srcFile, err := os.Open(arquivoTemporario)
		if err != nil {
			os.Remove(arquivoTemporario)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao abrir arquivo temporário"})
		}
		defer srcFile.Close()

		dstFile, err := os.Create(caminhoFinal)
		if err != nil {
			srcFile.Close()
			os.Remove(arquivoTemporario)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criar arquivo final"})
		}
		defer dstFile.Close()

		_, err = io.Copy(dstFile, srcFile)
		if err != nil {
			srcFile.Close()
			dstFile.Close()
			os.Remove(arquivoTemporario)
			os.Remove(caminhoFinal)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao copiar arquivo"})
		}

		// Remove o arquivo temporário
		os.Remove(arquivoTemporario)

		// Obtém informações do arquivo para o histórico
		fileInfo, err := os.Stat(caminhoFinal)
		if err != nil {
			os.Remove(caminhoFinal)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao obter informações do arquivo"})
		}

		// Atualiza o caminho do arquivo no banco de dados
		imovel.ArquivoContrato = caminhoFinal
		if result := database.DB.Save(&imovel); result.Error != nil {
			// Se falhar ao salvar, remove o arquivo criado
			os.Remove(caminhoFinal)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao atualizar caminho do arquivo"})
		}

		// Cria registro no histórico de contratos
		historicoContrato := models.HistoricoContrato{
			ImovelID:       imovel.ID,
			NomeArquivo:    nomeArquivoOriginal,
			CaminhoArquivo: caminhoFinal,
			TamanhoArquivo: fileInfo.Size(),
			DataInsercao:   time.Now(),
		}

		if result := database.DB.Create(&historicoContrato); result.Error != nil {
			// Se falhar ao criar histórico, loga o erro mas não falha a criação do imóvel
			// O arquivo já foi salvo e o imóvel já foi criado
			fmt.Printf("Erro ao criar histórico de contrato: %v\n", result.Error)
		}
	}

	// Recarrega o imóvel com o inquilino associado
	database.DB.Preload("Inquilino").First(&imovel, imovel.ID)

	return c.Status(fiber.StatusCreated).JSON(imovel)
}

// ListarImoveis - Retorna imóveis do usuário (cliente vê só os seus; admin vê todos)
func ListarImoveis(c *fiber.Ctx) error {
	var imoveis []models.Imovel
	q := database.DB.Preload("Inquilino")
	if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
		if uid, ok := c.Locals("user_id").(uint); ok {
			q = q.Where("user_id = ?", uid)
		}
	}
	if result := q.Find(&imoveis); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao buscar imóveis"})
	}
	return c.JSON(imoveis)
}

// BuscarImovel - Retorna UM imóvel com TODOS os detalhes (cliente só acessa os próprios)
func BuscarImovel(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}

	var imovel models.Imovel
	result := database.DB.
		Preload("Inquilino").           // Traz o objeto Inquilino
		Preload("HistoricoPagamentos"). // Traz o array de pagamentos
		Preload("HistoricoValores").    // Traz o histórico de preços
		First(&imovel, id)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Imóvel não encontrado"})
	}
	if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
		if uid, ok := c.Locals("user_id").(uint); ok && (imovel.UserID == nil || *imovel.UserID != uid) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Imóvel não encontrado"})
		}
	}
	return c.JSON(imovel)
}

// EditarImovel - Atualiza dados cadastrais (cliente só edita os próprios)
func EditarImovel(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "ID inválido",
			"campo":   "id",
			"message": "O valor do parâmetro ID não é um inteiro válido.",
		})
	}

	var imovel models.Imovel

	if result := database.DB.First(&imovel, id); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Imóvel não encontrado",
			"campo":   "id",
			"message": "Nenhum imóvel foi encontrado com o ID informado.",
		})
	}
	if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
		if uid, ok := c.Locals("user_id").(uint); ok && (imovel.UserID == nil || *imovel.UserID != uid) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Imóvel não encontrado"})
		}
	}

	// Lê o body como JSON raw antes de fazer parse
	bodyBytes := c.Body()
	if len(bodyBytes) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":           "Dados inválidos",
			"camposInvalidos": []string{},
			"message":         "Corpo da requisição está vazio",
		})
	}

	// Primeiro, tenta fazer parse para um map para validar campos
	body := make(map[string]interface{})
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":           "Dados inválidos",
			"camposInvalidos": []string{},
			"message":         "Falha ao processar JSON: " + err.Error(),
		})
	}

	// Valida campos obrigatórios e formatos
	invalidFields := []string{}
	invalidMessages := make(map[string]string)

	// Validar endereço
	if endereco, ok := body["endereco"].(string); !ok || endereco == "" {
		invalidFields = append(invalidFields, "endereco")
		invalidMessages["endereco"] = "Endereço é obrigatório e não pode ser vazio"
	}

	// Validar valores numéricos (se presentes, devem ser positivos)
	if valorAluguel, ok := body["valorAluguel"]; ok {
		if val, ok := valorAluguel.(float64); !ok || val < 0 {
			invalidFields = append(invalidFields, "valorAluguel")
			invalidMessages["valorAluguel"] = "Valor do aluguel deve ser um número positivo"
		}
	}

	if valorCondominio, ok := body["valorCondominio"]; ok {
		if val, ok := valorCondominio.(float64); !ok || val < 0 {
			invalidFields = append(invalidFields, "valorCondominio")
			invalidMessages["valorCondominio"] = "Valor do condomínio deve ser um número positivo"
		}
	}

	if valorIptu, ok := body["valorIptu"]; ok {
		if val, ok := valorIptu.(float64); !ok || val < 0 {
			invalidFields = append(invalidFields, "valorIptu")
			invalidMessages["valorIptu"] = "Valor do IPTU deve ser um número positivo"
		}
	}

	if valorCaucao, ok := body["valorCaucao"]; ok {
		if val, ok := valorCaucao.(float64); !ok || val < 0 {
			invalidFields = append(invalidFields, "valorCaucao")
			invalidMessages["valorCaucao"] = "Valor da caução deve ser um número positivo"
		}
	}

	// Validar data (se presente, deve ser string válida)
	if dataInicioContrato, ok := body["dataInicioContrato"]; ok {
		if dataStr, ok := dataInicioContrato.(string); !ok || dataStr == "" {
			invalidFields = append(invalidFields, "dataInicioContrato")
			invalidMessages["dataInicioContrato"] = "Data de início do contrato deve ser uma string válida"
		}
		// A validação do formato será feita ao fazer parse para o modelo
	}

	// Validar arquivoContrato (se presente, deve ser string)
	if arquivoContrato, ok := body["arquivoContrato"]; ok {
		if _, ok := arquivoContrato.(string); !ok {
			invalidFields = append(invalidFields, "arquivoContrato")
			invalidMessages["arquivoContrato"] = "Arquivo do contrato deve ser uma string"
		}
	}

	// Se houver campos inválidos, retorna erro detalhado
	if len(invalidFields) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":           "Dados inválidos",
			"camposInvalidos": invalidFields,
			"detalhes":        invalidMessages,
			"message":         "Um ou mais campos obrigatórios não foram enviados ou estão inválidos.",
		})
	}

	// Agora faz parse para o modelo Imovel usando os bytes originais
	var dadosAtualizados models.Imovel
	if err := json.Unmarshal(bodyBytes, &dadosAtualizados); err != nil {
		// Se falhar no parse do modelo, pode ser problema de formato (ex: data)
		invalidFields = []string{"dataInicioContrato"}
		invalidMessages["dataInicioContrato"] = "Formato de data inválido. Use o formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SSZ). Erro: " + err.Error()
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":           "Dados inválidos",
			"camposInvalidos": invalidFields,
			"detalhes":        invalidMessages,
			"message":         "Erro ao processar dados: " + err.Error(),
		})
	}

	// Validações finais no modelo parseado
	invalid := make(map[string]string)
	if dadosAtualizados.Endereco == "" {
		invalid["endereco"] = "Endereço não pode ser vazio"
	}
	if dadosAtualizados.ValorAluguel < 0 {
		invalid["valorAluguel"] = "Valor do aluguel não pode ser negativo"
	}
	if dadosAtualizados.ValorCondominio < 0 {
		invalid["valorCondominio"] = "Valor do condomínio não pode ser negativo"
	}
	if dadosAtualizados.ValorIptu < 0 {
		invalid["valorIptu"] = "Valor do IPTU não pode ser negativo"
	}
	if dadosAtualizados.ValorCaucao < 0 {
		invalid["valorCaucao"] = "Valor da caução não pode ser negativo"
	}

	if len(invalid) > 0 {
		invalidFieldsList := make([]string, 0, len(invalid))
		for campo := range invalid {
			invalidFieldsList = append(invalidFieldsList, campo)
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":           "Dados inválidos",
			"camposInvalidos": invalidFieldsList,
			"detalhes":        invalid,
			"message":         "Um ou mais campos estão inválidos.",
		})
	}

	// Salvar valores antigos antes de atualizar
	valorAluguelAntigo := imovel.ValorAluguel
	valorCondominioAntigo := imovel.ValorCondominio
	valorIptuAntigo := imovel.ValorIptu
	valorCaucaoAntigo := imovel.ValorCaucao
	inquilinoIDAntigo := imovel.InquilinoID
	novoInquilinoID := dadosAtualizados.InquilinoID

	// Atualiza apenas os campos permitidos (exclui relacionamentos e campos de sistema)
	// Omit exclui os relacionamentos e campos que não devem ser atualizados
	if result := database.DB.Model(&imovel).Omit(
		"Inquilino",
		"HistoricoPagamentos",
		"HistoricoValores",
		"CreatedAt",
		"UpdatedAt",
		"ID",
	).Updates(dadosAtualizados); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Erro ao atualizar imóvel",
			"message": result.Error.Error(),
		})
	}

	// Sincronizar o lado do inquilino: desvincular o inquilino antigo e vincular o novo
	if inquilinoIDAntigo != nil && *inquilinoIDAntigo > 0 {
		database.DB.Model(&models.Inquilino{}).Where("id = ?", *inquilinoIDAntigo).Update("imovel_id", nil)
	}
	if novoInquilinoID != nil && *novoInquilinoID > 0 {
		database.DB.Model(&models.Inquilino{}).Where("id = ?", *novoInquilinoID).Update("imovel_id", imovel.ID)
	}

	// Verificar alterações de valores e criar registros no histórico
	// Verificamos se o campo foi enviado no body e se o valor mudou
	historicoValores := []models.HistoricoValor{}
	agora := time.Now()

	// Verificar se valorAluguel foi enviado no body e se mudou
	if _, ok := body["valorAluguel"]; ok {
		valorNovoAluguel, _ := body["valorAluguel"].(float64)
		if valorNovoAluguel != valorAluguelAntigo {
			historicoValores = append(historicoValores, models.HistoricoValor{
				ImovelID:        imovel.ID,
				CampoAlterado:   "aluguel",
				ValorAntigo:     valorAluguelAntigo,
				ValorNovo:       valorNovoAluguel,
				MotivoAlteracao: "Alteração de valor do aluguel",
				DataAlteracao:   agora,
			})
		}
	}

	// Verificar se valorCondominio foi enviado no body e se mudou
	if _, ok := body["valorCondominio"]; ok {
		valorNovoCondominio, _ := body["valorCondominio"].(float64)
		if valorNovoCondominio != valorCondominioAntigo {
			historicoValores = append(historicoValores, models.HistoricoValor{
				ImovelID:        imovel.ID,
				CampoAlterado:   "condominio",
				ValorAntigo:     valorCondominioAntigo,
				ValorNovo:       valorNovoCondominio,
				MotivoAlteracao: "Alteração de valor do condomínio",
				DataAlteracao:   agora,
			})
		}
	}

	// Verificar se valorIptu foi enviado no body e se mudou
	if _, ok := body["valorIptu"]; ok {
		valorNovoIptu, _ := body["valorIptu"].(float64)
		if valorNovoIptu != valorIptuAntigo {
			historicoValores = append(historicoValores, models.HistoricoValor{
				ImovelID:        imovel.ID,
				CampoAlterado:   "iptu",
				ValorAntigo:     valorIptuAntigo,
				ValorNovo:       valorNovoIptu,
				MotivoAlteracao: "Alteração de valor do IPTU",
				DataAlteracao:   agora,
			})
		}
	}

	// Verificar se valorCaucao foi enviado no body e se mudou
	if _, ok := body["valorCaucao"]; ok {
		valorNovoCaucao, _ := body["valorCaucao"].(float64)
		if valorNovoCaucao != valorCaucaoAntigo {
			historicoValores = append(historicoValores, models.HistoricoValor{
				ImovelID:        imovel.ID,
				CampoAlterado:   "caucao",
				ValorAntigo:     valorCaucaoAntigo,
				ValorNovo:       valorNovoCaucao,
				MotivoAlteracao: "Alteração de valor da caução",
				DataAlteracao:   agora,
			})
		}
	}

	// Criar registros no histórico se houver alterações
	if len(historicoValores) > 0 {
		for _, historico := range historicoValores {
			if result := database.DB.Create(&historico); result.Error != nil {
				// Log do erro mas não falha a atualização do imóvel
				fmt.Printf("Erro ao criar histórico de valor: %v\n", result.Error)
			}
		}
	}

	// Recarrega o imóvel atualizado
	database.DB.First(&imovel, id)

	return c.JSON(imovel)
}

// BaixarContratoMaisRecente - Retorna o contrato mais recente de um imóvel para download
func BaixarContratoMaisRecente(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}

	// Busca o contrato mais recente do imóvel
	var historicoContrato models.HistoricoContrato
	result := database.DB.
		Where("imovel_id = ?", id).
		Order("data_insercao DESC").
		First(&historicoContrato)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Nenhum contrato encontrado para este imóvel"})
	}

	// Verifica se o arquivo existe
	if _, err := os.Stat(historicoContrato.CaminhoArquivo); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Arquivo não encontrado no servidor"})
	}

	// Retorna o arquivo para download
	return c.Download(historicoContrato.CaminhoArquivo, historicoContrato.NomeArquivo)
}

// ListarContratos - Retorna todos os contratos de um imóvel
func ListarContratos(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}

	// Busca todos os contratos do imóvel ordenados por data de inserção (mais recente primeiro)
	var historicoContratos []models.HistoricoContrato
	result := database.DB.
		Where("imovel_id = ?", id).
		Order("data_insercao DESC").
		Find(&historicoContratos)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao buscar contratos"})
	}

	// Se não houver contratos, retorna array vazio
	if len(historicoContratos) == 0 {
		return c.JSON([]models.HistoricoContrato{})
	}

	return c.JSON(historicoContratos)
}

// BaixarContratoPorId - Retorna um contrato específico por ID para download
func BaixarContratoPorId(c *fiber.Ctx) error {
	imovelId, err := c.ParamsInt("imovelId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID do imóvel inválido"})
	}

	contratoId, err := c.ParamsInt("contratoId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID do contrato inválido"})
	}

	// Busca o contrato específico
	var historicoContrato models.HistoricoContrato
	result := database.DB.
		Where("id = ? AND imovel_id = ?", contratoId, imovelId).
		First(&historicoContrato)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Contrato não encontrado"})
	}

	// Verifica se o arquivo existe
	if _, err := os.Stat(historicoContrato.CaminhoArquivo); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Arquivo não encontrado no servidor"})
	}

	// Retorna o arquivo para download
	return c.Download(historicoContrato.CaminhoArquivo, historicoContrato.NomeArquivo)
}

// CriarPagamento - Cria um novo pagamento para um imóvel
func CriarPagamento(c *fiber.Ctx) error {
	imovelId, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID do imóvel inválido"})
	}

	// Verifica se o imóvel existe
	var imovel models.Imovel
	if result := database.DB.First(&imovel, imovelId); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Imóvel não encontrado"})
	}

	// Verifica se o imóvel tem inquilino
	if imovel.InquilinoID == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Imóvel não possui inquilino cadastrado"})
	}

	// Parse do body JSON
	var pagamentoData struct {
		Tipo           string  `json:"tipo"`
		Valor          float64 `json:"valor"`
		DataVencimento string  `json:"dataVencimento"`
		Status         string  `json:"status"`
		MesReferencia  string  `json:"mesReferencia"`
	}

	if err := c.BodyParser(&pagamentoData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos: " + err.Error()})
	}

	// Validações
	if pagamentoData.Tipo == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tipo de pagamento é obrigatório"})
	}
	if pagamentoData.Tipo != "aluguel" && pagamentoData.Tipo != "iptu" && pagamentoData.Tipo != "condominio" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tipo de pagamento inválido. Deve ser: aluguel, iptu ou condominio"})
	}
	if pagamentoData.Valor <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Valor deve ser maior que zero"})
	}
	if pagamentoData.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Status é obrigatório"})
	}
	if pagamentoData.Status != "pendente" && pagamentoData.Status != "atrasado" && pagamentoData.Status != "pago" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Status inválido. Deve ser: pendente, atrasado ou pago"})
	}
	if pagamentoData.DataVencimento == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data de vencimento é obrigatória"})
	}

	// Parse da data de vencimento
	dataVencimento, err := time.Parse("2006-01-02", pagamentoData.DataVencimento)
	if err != nil {
		// Tenta outro formato
		dataVencimento, err = time.Parse("2006-01-02T15:04:05Z", pagamentoData.DataVencimento)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Formato de data inválido. Use YYYY-MM-DD"})
		}
	}

	// Cria o pagamento
	pagamento := models.Pagamento{
		ImovelID:       uint(imovelId),
		InquilinoID:    *imovel.InquilinoID,
		Tipo:           pagamentoData.Tipo,
		Valor:          pagamentoData.Valor,
		DataVencimento: dataVencimento,
		Status:         pagamentoData.Status,
		MesReferencia:  pagamentoData.MesReferencia,
	}

	// Se o status for "pago", define a data de pagamento como hoje
	if pagamentoData.Status == "pago" {
		agora := time.Now()
		pagamento.DataPagamento = &agora
	}

	// Salva no banco
	if result := database.DB.Create(&pagamento); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criar pagamento: " + result.Error.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(pagamento)
}

// AtualizarPagamento - Atualiza um pagamento existente
func AtualizarPagamento(c *fiber.Ctx) error {
	imovelId, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID do imóvel inválido"})
	}

	pagamentoId, err := c.ParamsInt("pagamentoId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID do pagamento inválido"})
	}

	// Verifica se o pagamento existe e pertence ao imóvel
	var pagamento models.Pagamento
	result := database.DB.Where("id = ? AND imovel_id = ?", pagamentoId, imovelId).First(&pagamento)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Pagamento não encontrado"})
	}

	// Parse do body JSON
	var pagamentoData struct {
		Tipo           string  `json:"tipo"`
		Valor          float64 `json:"valor"`
		DataVencimento string  `json:"dataVencimento"`
		Status         string  `json:"status"`
		MesReferencia  string  `json:"mesReferencia"`
		DataPagamento  *string `json:"dataPagamento"` // Opcional, pode ser null
	}

	if err := c.BodyParser(&pagamentoData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos: " + err.Error()})
	}

	// Validações
	if pagamentoData.Tipo == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tipo de pagamento é obrigatório"})
	}
	if pagamentoData.Tipo != "aluguel" && pagamentoData.Tipo != "iptu" && pagamentoData.Tipo != "condominio" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tipo de pagamento inválido. Deve ser: aluguel, iptu ou condominio"})
	}
	if pagamentoData.Valor <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Valor deve ser maior que zero"})
	}
	if pagamentoData.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Status é obrigatório"})
	}
	if pagamentoData.Status != "pendente" && pagamentoData.Status != "atrasado" && pagamentoData.Status != "pago" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Status inválido. Deve ser: pendente, atrasado ou pago"})
	}
	if pagamentoData.DataVencimento == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Data de vencimento é obrigatória"})
	}

	// Parse da data de vencimento
	dataVencimento, err := time.Parse("2006-01-02", pagamentoData.DataVencimento)
	if err != nil {
		// Tenta outro formato
		dataVencimento, err = time.Parse("2006-01-02T15:04:05Z", pagamentoData.DataVencimento)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Formato de data inválido. Use YYYY-MM-DD"})
		}
	}

	// Atualiza os campos do pagamento
	pagamento.Tipo = pagamentoData.Tipo
	pagamento.Valor = pagamentoData.Valor
	pagamento.DataVencimento = dataVencimento
	pagamento.Status = pagamentoData.Status
	pagamento.MesReferencia = pagamentoData.MesReferencia

	// Trata dataPagamento
	if pagamentoData.DataPagamento != nil && *pagamentoData.DataPagamento != "" {
		// Se foi enviada uma data de pagamento, faz parse
		dataPagamento, err := time.Parse("2006-01-02", *pagamentoData.DataPagamento)
		if err != nil {
			// Tenta outro formato
			dataPagamento, err = time.Parse("2006-01-02T15:04:05Z", *pagamentoData.DataPagamento)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Formato de data de pagamento inválido. Use YYYY-MM-DD"})
			}
		}
		pagamento.DataPagamento = &dataPagamento
	} else {
		// Se status for "pago" mas não tiver dataPagamento, define como hoje
		if pagamentoData.Status == "pago" && pagamento.DataPagamento == nil {
			agora := time.Now()
			pagamento.DataPagamento = &agora
		} else if pagamentoData.Status != "pago" {
			// Se status não for "pago", remove a data de pagamento
			pagamento.DataPagamento = nil
		}
	}

	// Salva as alterações
	if result := database.DB.Save(&pagamento); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao atualizar pagamento: " + result.Error.Error()})
	}

	return c.JSON(pagamento)
}

// ResumoPayload agrupa totais e atrasados por tipo de pagamento
func resumoPorTipo(pagamentos []models.Pagamento, tipo string) (total, atrasados int, nomes []string) {
	nomesMap := make(map[string]bool)
	for _, p := range pagamentos {
		if p.Tipo != tipo {
			continue
		}
		total++
		if p.Status == "atrasado" {
			atrasados++
			if p.Inquilino != nil && p.Inquilino.Nome != "" {
				nomesMap[p.Inquilino.Nome] = true
			}
		}
	}
	for n := range nomesMap {
		nomes = append(nomes, n)
	}
	return total, atrasados, nomes
}

// Resumo retorna totais e atrasados por tipo (aluguel, condominio, iptu) e valor total dos alugueis a receber
func Resumo(c *fiber.Ctx) error {
	var pagamentos []models.Pagamento
	if result := database.DB.Preload("Inquilino").Where("status IN ?", []string{"pendente", "atrasado"}).Find(&pagamentos); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao buscar resumo"})
	}
	totalAluguel, atrasadosAluguel, nomesAluguel := resumoPorTipo(pagamentos, "aluguel")
	totalCond, atrasadosCond, nomesCond := resumoPorTipo(pagamentos, "condominio")
	totalIptu, atrasadosIptu, nomesIptu := resumoPorTipo(pagamentos, "iptu")

	var valorTotalAlugueisReceber float64
	q := database.DB.Model(&models.Imovel{}).Select("COALESCE(SUM(valor_aluguel), 0)")
	if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
		if uid, ok := c.Locals("user_id").(uint); ok {
			q = q.Where("user_id = ?", uid)
		}
	}
	if result := q.Scan(&valorTotalAlugueisReceber); result.Error != nil {
		valorTotalAlugueisReceber = 0
	}

	return c.JSON(fiber.Map{
		"valorTotalAlugueisReceber": valorTotalAlugueisReceber,
		"alugueis": fiber.Map{
			"total":          totalAluguel,
			"atrasados":      atrasadosAluguel,
			"nomesAtrasados": nomesAluguel,
		},
		"condominio": fiber.Map{
			"total":          totalCond,
			"atrasados":      atrasadosCond,
			"nomesAtrasados": nomesCond,
		},
		"iptu": fiber.Map{
			"total":          totalIptu,
			"atrasados":      atrasadosIptu,
			"nomesAtrasados": nomesIptu,
		},
	})
}
