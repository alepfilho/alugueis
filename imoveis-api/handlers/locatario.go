package handlers

import (
	"imoveis-api/database"
	"imoveis-api/models"

	"github.com/gofiber/fiber/v2"
)

func ListarInquilinos(c *fiber.Ctx) error {
	var inquilinos []models.Inquilino

	// Busca todos os registos na tabela 'inquilinos'
	// O GORM faz automaticamente o "SELECT * FROM inquilinos"
	if result := database.DB.Find(&inquilinos); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao procurar inquilinos",
		})
	}

	// Devolve a lista em formato JSON
	return c.JSON(inquilinos)
}

func BuscarInquilino(c *fiber.Ctx) error {
	// 1. Pega o ID da URL (ex: /api/inquilinos/5)
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}

	var inquilino models.Inquilino

	// 2. Busca no banco de dados
	// O método .First vai preencher a variável 'inquilino' ou retornar erro se não achar
	if result := database.DB.First(&inquilino, id); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Inquilino não encontrado"})
	}

	// 3. Retorna o objeto encontrado
	return c.JSON(inquilino)
}

// CriarInquilino adiciona um novo locatário
func CriarInquilino(c *fiber.Ctx) error {
	// Cria uma instância vazia
	inquilino := new(models.Inquilino)

	// Faz o parse do JSON enviado no corpo da requisição
	if err := c.BodyParser(inquilino); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Não foi possível ler os dados enviados",
		})
	}

	// Salva no banco de dados
	// O GORM preenche automaticamente o ID e o CreatedAt
	if result := database.DB.Create(&inquilino); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao salvar inquilino no banco de dados",
		})
	}

	// Retorna o objeto criado com o ID gerado
	return c.Status(fiber.StatusCreated).JSON(inquilino)
}

// EditarInquilino atualiza dados de um locatário existente
func EditarInquilino(c *fiber.Ctx) error {
	// 1. Pega o ID da URL (ex: /inquilinos/5)
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}

	// 2. Busca o inquilino no banco
	var inquilino models.Inquilino
	if result := database.DB.First(&inquilino, id); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Inquilino não encontrado"})
	}

	// 3. Lê os novos dados enviados pelo usuário
	var dadosAtualizados models.Inquilino
	if err := c.BodyParser(&dadosAtualizados); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	// 4. Atualiza os campos
	// Nota: Usamos inquilino.Nome = ... para garantir controle total do que é alterado
	inquilino.Nome = dadosAtualizados.Nome
	inquilino.Email = dadosAtualizados.Email
	inquilino.Telefone = dadosAtualizados.Telefone
	inquilino.ImovelID = dadosAtualizados.ImovelID // Pode ser nulo se ele saiu do imóvel

	// 5. Salva as alterações
	database.DB.Save(&inquilino)

	return c.JSON(inquilino)
}
