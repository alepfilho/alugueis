package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// JWTSecretKey retorna a chave do .env
func getJWTSecret() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}

// RequireAuth valida o Bearer token e coloca user_id e role em c.Locals.
// Retorna 401 se o token estiver ausente ou inválido.
func RequireAuth(c *fiber.Ctx) error {
	auth := c.Get("Authorization")
	if auth == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token não informado"})
	}
	parts := strings.SplitN(auth, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Formato de token inválido"})
	}
	tokenString := parts[1]

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})
	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido ou expirado"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
	}

	userID, _ := claims["user_id"].(float64)
	role, _ := claims["role"].(string)
	if role == "" {
		role = "admin" // compatibilidade com tokens antigos
	}

	c.Locals("user_id", uint(userID))
	c.Locals("role", role)
	return c.Next()
}

// RequireAdmin deve ser usado após RequireAuth. Retorna 403 se o usuário não for admin.
func RequireAdmin(c *fiber.Ctx) error {
	role, ok := c.Locals("role").(string)
	if !ok || role != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Acesso negado. Apenas administradores podem realizar esta ação."})
	}
	return c.Next()
}
