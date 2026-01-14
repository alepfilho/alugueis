package routes

import (
	"imoveis-api/handlers"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	// Autenticação
	auth := api.Group("/auth")
	auth.Post("/register", handlers.Register)
	auth.Post("/login", handlers.Login)

	// --- NOVAS ROTAS DE INQUILINOS ---
	inquilinos := api.Group("/inquilinos")

	// POST /api/inquilinos -> Cria novo
	inquilinos.Post("/", handlers.CriarInquilino)

	// PUT /api/inquilinos/:id -> Edita existente (passando o ID na URL)
	inquilinos.Put("/:id", handlers.EditarInquilino)

	// GET /api/inquilinos -> Lista todos
	inquilinos.Get("/", handlers.ListarInquilinos)
	// Importante: Coloque rotas com parâmetros (/:id) depois das rotas fixas, se houver
	inquilinos.Get("/:id", handlers.BuscarInquilino)

	// --- ROTAS DE IMÓVEIS ---
	imoveis := api.Group("/imoveis")
	imoveis.Post("/", handlers.CriarImovel)                                       // Criar
	imoveis.Get("/", handlers.ListarImoveis)                                      // Listar Todos
	imoveis.Get("/:imovelId/contratos/:contratoId", handlers.BaixarContratoPorId) // Baixar contrato específico
	imoveis.Get("/:id/contratos", handlers.ListarContratos)                       // Listar todos os contratos
	imoveis.Get("/:id/contrato", handlers.BaixarContratoMaisRecente)              // Baixar contrato mais recente
	imoveis.Post("/:id/pagamentos", handlers.CriarPagamento)                      // Criar pagamento
	imoveis.Put("/:id/pagamentos/:pagamentoId", handlers.AtualizarPagamento)      // Atualizar pagamento
	imoveis.Get("/:id", handlers.BuscarImovel)                                    // Detalhes (Get One)
	imoveis.Put("/:id", handlers.EditarImovel)                                    // Atualizar
}
