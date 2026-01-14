package handlers

import (
	"encoding/json"
	"imoveis-api/database"
	"imoveis-api/models"

	"github.com/gofiber/fiber/v2"
)

// CriarImovel - Adiciona um novo imóvel
func CriarImovel(c *fiber.Ctx) error {
	// Primeiro, faz parse do body para um map para extrair locatarioId
	body := make(map[string]interface{})
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	// Extrai locatarioId se presente
	var locatarioId interface{}
	var locatarioIdUint *uint
	if locId, ok := body["locatarioId"]; ok && locId != nil {
		locatarioId = locId
		// Remove do body para não interferir no parse do Imovel
		delete(body, "locatarioId")
	}

	// Converte locatarioId para uint se presente
	if locatarioId != nil {
		var locIdUint uint

		// Tenta converter de float64 (JSON numbers são float64 por padrão)
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
	imovel := new(models.Imovel)
	if err := json.Unmarshal(bodyBytes, imovel); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	// Cria o imóvel
	if result := database.DB.Create(&imovel); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criar imóvel"})
	}

	// Se foi fornecido um locatarioId, associa o inquilino ao imóvel
	if locatarioIdUint != nil {
		var inquilino models.Inquilino
		if result := database.DB.First(&inquilino, *locatarioIdUint); result.Error != nil {
			// Se o inquilino não for encontrado, não falha a criação do imóvel, apenas loga
			// Mas podemos retornar erro se preferir
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquilino não encontrado"})
		}
		// Atualiza o ImovelID do inquilino
		inquilino.ImovelID = &imovel.ID
		if result := database.DB.Save(&inquilino); result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao associar inquilino ao imóvel"})
		}
	}

	// Recarrega o imóvel com o inquilino associado
	database.DB.Preload("Inquilino").First(&imovel, imovel.ID)

	return c.Status(fiber.StatusCreated).JSON(imovel)
}

// ListarImoveis - Retorna todos (com dados básicos do Inquilino)
func ListarImoveis(c *fiber.Ctx) error {
	var imoveis []models.Imovel

	// O .Preload("Inquilino") traz os dados de quem está alugando
	// Se quiser trazer TUDO na listagem, adicione mais Preloads, mas pode ficar pesado.
	if result := database.DB.Preload("Inquilino").Find(&imoveis); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao buscar imóveis"})
	}

	return c.JSON(imoveis)
}

// BuscarImovel - Retorna UM imóvel com TODOS os detalhes (Pagamentos, Histórico, etc)
func BuscarImovel(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}

	var imovel models.Imovel

	// Aqui carregamos TUDO que a interface IDetalhesImovel precisa
	result := database.DB.
		Preload("Inquilino").           // Traz o objeto Inquilino
		Preload("HistoricoPagamentos"). // Traz o array de pagamentos
		Preload("HistoricoValores").    // Traz o histórico de preços
		First(&imovel, id)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Imóvel não encontrado"})
	}

	return c.JSON(imovel)
}

// EditarImovel - Atualiza dados cadastrais
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

	// Recarrega o imóvel atualizado
	database.DB.First(&imovel, id)

	return c.JSON(imovel)
}
