package handlers

import (
	"imoveis-api/database"
	"imoveis-api/models"

	"github.com/gofiber/fiber/v2"
)

// ListarInquilinos - Retorna inquilinos do usuário (cliente vê só os seus; admin vê todos)
func ListarInquilinos(c *fiber.Ctx) error {
	var inquilinos []models.Inquilino
	q := database.DB
	if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
		if uid, ok := c.Locals("user_id").(uint); ok {
			q = q.Where("user_id = ?", uid)
		}
	}
	if result := q.Find(&inquilinos); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao procurar inquilinos",
		})
	}
	return c.JSON(inquilinos)
}

// BuscarInquilino - Retorna um inquilino (cliente só acessa os próprios)
func BuscarInquilino(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}
	var inquilino models.Inquilino
	if result := database.DB.First(&inquilino, id); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Inquilino não encontrado"})
	}
	if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
		if uid, ok := c.Locals("user_id").(uint); ok && (inquilino.UserID == nil || *inquilino.UserID != uid) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Inquilino não encontrado"})
		}
	}
	return c.JSON(inquilino)
}

// CriarInquilino adiciona um novo locatário (vinculado ao usuário quando for cliente)
func CriarInquilino(c *fiber.Ctx) error {
	inquilino := new(models.Inquilino)
	if err := c.BodyParser(inquilino); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Não foi possível ler os dados enviados",
		})
	}
	if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
		if uid, ok := c.Locals("user_id").(uint); ok {
			inquilino.UserID = &uid
		}
	}
	if inquilino.ImovelID != nil && *inquilino.ImovelID > 0 {
		var imovel models.Imovel
		if result := database.DB.First(&imovel, *inquilino.ImovelID); result.Error != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Imóvel não encontrado"})
		}
		if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
			if uid, ok := c.Locals("user_id").(uint); ok && (imovel.UserID == nil || *imovel.UserID != uid) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Imóvel não encontrado"})
			}
		}
	}
	if result := database.DB.Create(inquilino); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erro ao salvar inquilino no banco de dados",
		})
	}

	// Sincronizar o lado do imóvel: desvincular inquilino anterior do imóvel (se houver) e vincular este
	if inquilino.ImovelID != nil && *inquilino.ImovelID > 0 {
		var imovel models.Imovel
		if database.DB.First(&imovel, *inquilino.ImovelID).Error == nil && imovel.InquilinoID != nil {
			database.DB.Model(&models.Inquilino{}).Where("id = ?", *imovel.InquilinoID).Update("imovel_id", nil)
		}
		database.DB.Model(&models.Imovel{}).Where("id = ?", *inquilino.ImovelID).Update("inquilino_id", inquilino.ID)
	}

	// Retorna o objeto criado com o ID gerado
	return c.Status(fiber.StatusCreated).JSON(inquilino)
}

// EditarInquilino atualiza dados de um locatário existente (cliente só edita os próprios)
func EditarInquilino(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}
	var inquilino models.Inquilino
	if result := database.DB.First(&inquilino, id); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Inquilino não encontrado"})
	}
	if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
		if uid, ok := c.Locals("user_id").(uint); ok && (inquilino.UserID == nil || *inquilino.UserID != uid) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Inquilino não encontrado"})
		}
	}
	var dadosAtualizados models.Inquilino
	if err := c.BodyParser(&dadosAtualizados); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}
	// Cliente só pode vincular inquilino a imóvel que seja dele
	if dadosAtualizados.ImovelID != nil && *dadosAtualizados.ImovelID > 0 {
		var imovel models.Imovel
		if result := database.DB.First(&imovel, *dadosAtualizados.ImovelID); result.Error != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Imóvel não encontrado"})
		}
		if role, ok := c.Locals("role").(string); ok && role == models.RoleCliente {
			if uid, ok := c.Locals("user_id").(uint); ok && (imovel.UserID == nil || *imovel.UserID != uid) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Imóvel não encontrado"})
			}
		}
	}
	imovelIDAntigo := inquilino.ImovelID
	novoImovelID := dadosAtualizados.ImovelID

	inquilino.Nome = dadosAtualizados.Nome
	inquilino.Email = dadosAtualizados.Email
	inquilino.Telefone = dadosAtualizados.Telefone
	inquilino.ImovelID = novoImovelID

	// Salva na tabela inquilinos (incluindo imovel_id)
	if result := database.DB.Save(&inquilino); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao salvar inquilino"})
	}

	// Sincroniza a tabela imoveis: desvincula o imóvel antigo e vincula o novo a este inquilino
	if imovelIDAntigo != nil && *imovelIDAntigo > 0 {
		database.DB.Model(&models.Imovel{}).Where("id = ?", *imovelIDAntigo).Update("inquilino_id", nil)
	}
	if novoImovelID != nil && *novoImovelID > 0 {
		var imovel models.Imovel
		if database.DB.First(&imovel, *novoImovelID).Error == nil && imovel.InquilinoID != nil && *imovel.InquilinoID != inquilino.ID {
			database.DB.Model(&models.Inquilino{}).Where("id = ?", *imovel.InquilinoID).Update("imovel_id", nil)
		}
		database.DB.Model(&models.Imovel{}).Where("id = ?", *novoImovelID).Update("inquilino_id", inquilino.ID)
	}

	return c.JSON(inquilino)
}
