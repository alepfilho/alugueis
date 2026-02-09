package handlers

import (
	"imoveis-api/database"
	"imoveis-api/models"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ListClientes lista apenas usuários com role "cliente" (admin only)
func ListClientes(c *fiber.Ctx) error {
	var users []models.User
	if result := database.DB.Where("role = ? AND active = ?", models.RoleCliente, true).Find(&users); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao listar clientes"})
	}
	// Resposta sem senha
	list := make([]fiber.Map, 0, len(users))
	for _, u := range users {
		list = append(list, fiber.Map{
			"id":         u.ID,
			"name":       u.Name,
			"email":      u.Email,
			"role":       u.Role,
			"active":     u.Active,
			"created_at": u.CreatedAt,
		})
	}
	return c.JSON(list)
}

// UpdateClienteInput para editar cliente (admin only)
type UpdateClienteInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"` // opcional; se vazio, não altera
}

// UpdateCliente edita um cliente por ID (admin only)
func UpdateCliente(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}
	var input UpdateClienteInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	var user models.User
	if result := database.DB.First(&user, id); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Cliente não encontrado"})
	}
	if user.Role != models.RoleCliente {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Apenas clientes podem ser editados por esta rota"})
	}
	if !user.Active {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Não é possível editar um cliente desativado"})
	}

	if input.Name != "" {
		user.Name = input.Name
	}
	if input.Email != "" {
		user.Email = input.Email
	}
	if input.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), 14)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criptografar senha"})
		}
		user.PasswordHash = string(hash)
	}

	if result := database.DB.Save(&user); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao salvar alterações"})
	}
	return c.JSON(fiber.Map{
		"message": "Cliente atualizado com sucesso",
		"user": fiber.Map{
			"id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role, "active": user.Active,
		},
	})
}

// DeactivateCliente desativa um cliente e exclui todos os imóveis e inquilinos dele (admin only)
func DeactivateCliente(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}
	userID := uint(id)

	var user models.User
	if result := database.DB.First(&user, userID); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Cliente não encontrado"})
	}
	if user.Role != models.RoleCliente {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Apenas clientes podem ser desativados por esta rota"})
	}
	if !user.Active {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cliente já está desativado"})
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		// 1) Buscar imóveis do cliente (onde user_id = userID)
		var imoveis []models.Imovel
		if res := tx.Where("user_id = ?", userID).Find(&imoveis); res.Error != nil {
			return res.Error
		}
		for _, im := range imoveis {
			// 2) Excluir pagamentos do imóvel
			if res := tx.Where("imovel_id = ?", im.ID).Delete(&models.Pagamento{}); res.Error != nil {
				return res.Error
			}
			// 3) Excluir histórico de valores
			if res := tx.Where("imovel_id = ?", im.ID).Delete(&models.HistoricoValor{}); res.Error != nil {
				return res.Error
			}
			// 4) Excluir histórico de contratos
			if res := tx.Where("imovel_id = ?", im.ID).Delete(&models.HistoricoContrato{}); res.Error != nil {
				return res.Error
			}
			// 5) Inquilinos vinculados a este imóvel: excluir
			if res := tx.Where("imovel_id = ?", im.ID).Delete(&models.Inquilino{}); res.Error != nil {
				return res.Error
			}
			// 6) Excluir o imóvel
			if res := tx.Delete(&im); res.Error != nil {
				return res.Error
			}
		}
		// 7) Desativar o usuário
		user.Active = false
		if res := tx.Save(&user); res.Error != nil {
			return res.Error
		}
		return nil
	})

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao desativar cliente"})
	}
	return c.JSON(fiber.Map{"message": "Cliente desativado com sucesso. Imóveis e inquilinos vinculados foram excluídos."})
}
