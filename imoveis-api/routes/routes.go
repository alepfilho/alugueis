package routes

import (
	"imoveis-api/handlers"
	"imoveis-api/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	// Autenticação
	auth := api.Group("/auth")
	auth.Post("/register", handlers.Register)
	auth.Post("/login", handlers.Login)
	auth.Post("/users", middleware.RequireAuth, middleware.RequireAdmin, handlers.CreateCliente)

	// --- ROTAS DE USUÁRIOS/CLIENTES (admin only) ---
	users := api.Group("/users", middleware.RequireAuth, middleware.RequireAdmin)
	users.Get("/", handlers.ListClientes)
	users.Put("/:id", handlers.UpdateCliente)
	users.Post("/:id/deactivate", handlers.DeactivateCliente)

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

	// --- RESUMO (dashboard) ---
	api.Get("/resumo", middleware.RequireAuth, handlers.Resumo)

	// --- ÍNDICES (IPCA / IGPM) ---
	api.Get("/indices", middleware.RequireAuth, handlers.GetIndices)
	api.Post("/indices/atualizar", middleware.RequireAuth, middleware.RequireAdmin, handlers.AtualizarIndices)

	// --- ROTAS DE IMÓVEIS ---
	imoveis := api.Group("/imoveis")
	imoveis.Post("/", middleware.RequireAuth, handlers.CriarImovel)               // Criar (requer login; se for cliente, imóvel fica vinculado a ele)
	imoveis.Get("/", handlers.ListarImoveis)                                      // Listar Todos
	imoveis.Get("/:imovelId/contratos/:contratoId", handlers.BaixarContratoPorId) // Baixar contrato específico
	imoveis.Get("/:id/contratos", handlers.ListarContratos)                       // Listar todos os contratos
	imoveis.Get("/:id/contrato", handlers.BaixarContratoMaisRecente)              // Baixar contrato mais recente
	imoveis.Post("/:id/pagamentos", handlers.CriarPagamento)                      // Criar pagamento
	imoveis.Put("/:id/pagamentos/:pagamentoId", handlers.AtualizarPagamento)      // Atualizar pagamento
	imoveis.Get("/:id", handlers.BuscarImovel)                                    // Detalhes (Get One)
	imoveis.Put("/:id", handlers.EditarImovel)                                    // Atualizar
}
