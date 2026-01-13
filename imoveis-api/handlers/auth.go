package handlers

import (
	"os"
	"time"

	"imoveis-api/database"
	"imoveis-api/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Estrutura auxiliar apenas para receber os dados do JSON de login
type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// 1. Rota de Login
func Login(c *fiber.Ctx) error {
	var input LoginInput
	var user models.User

	// Tenta ler o JSON enviado pelo Angular/Postman
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Erro ao ler dados de entrada"})
	}

	// Busca o usuário no banco pelo email
	// .First() retorna erro se não achar nada
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Email ou senha inválidos"})
	}

	// Compara a senha enviada (input.Password) com o hash do banco (user.PasswordHash)
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Email ou senha inválidos"})
	}

	// Se chegou aqui, a senha está correta! Vamos gerar o Token JWT.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"exp":     time.Now().Add(time.Hour * 24).Unix(), // Expira em 24h
	})

	// Assina o token com a chave secreta do .env
	t, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao gerar token"})
	}

	// Retorna o token e dados básicos do usuário (sem a senha!)
	return c.JSON(fiber.Map{
		"message": "Login realizado com sucesso",
		"token":   t,
		"user": fiber.Map{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		},
	})
}

// 2. Rota de Registro (Para criar o primeiro usuário)
func Register(c *fiber.Ctx) error {
	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	// Criptografa a senha antes de salvar
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), 14) // Custo 14 é bem seguro
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erro ao criptografar senha"})
	}

	newUser := models.User{
		Name:         input.Name,
		Email:        input.Email,
		PasswordHash: string(hash),
	}

	// Salva no banco
	if result := database.DB.Create(&newUser); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Não foi possível criar o usuário. Email já existe?"})
	}

	return c.Status(fiber.StatusCreated).JSON(newUser)
}
