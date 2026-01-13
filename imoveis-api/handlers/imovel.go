package handlers

import (
	"imoveis-api/database"
	"imoveis-api/models"

	"github.com/gofiber/fiber/v2"
)

// CriarImovel - Adiciona um novo imóvel
func CriarImovel(c *fiber.Ctx) error {
	imovel := new(models.Imovel)

	if err := c.BodyParser(imovel); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	if result := database.DB.Create(&imovel); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criar imóvel"})
	}

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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}

	var imovel models.Imovel

	// 1. Verifica se existe
	if result := database.DB.First(&imovel, id); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Imóvel não encontrado"})
	}

	// 2. Lê os novos dados
	var dadosAtualizados models.Imovel
	if err := c.BodyParser(&dadosAtualizados); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	// 3. Atualiza no banco
	// O método Updates atualiza apenas os campos não-nulos enviados
	database.DB.Model(&imovel).Updates(dadosAtualizados)

	return c.JSON(imovel)
}
