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

	// --- ROTAS DE INQUILINOS (requer auth; cliente vê/só edita os próprios) ---
	inquilinos := api.Group("/inquilinos", middleware.RequireAuth)
	inquilinos.Get("/", handlers.ListarInquilinos)
	inquilinos.Post("/", handlers.CriarInquilino)
	inquilinos.Get("/:id", handlers.BuscarInquilino)
	inquilinos.Put("/:id", handlers.EditarInquilino)

	// --- RESUMO (dashboard) ---
	api.Get("/resumo", middleware.RequireAuth, handlers.Resumo)

	// --- ÍNDICES (IPCA / IGPM) ---
	api.Get("/indices", middleware.RequireAuth, handlers.GetIndices)
	api.Post("/indices/atualizar", middleware.RequireAuth, middleware.RequireAdmin, handlers.AtualizarIndices)

	// --- ROTAS DE IMÓVEIS (requer auth; cliente vê/só edita os próprios) ---
	imoveis := api.Group("/imoveis", middleware.RequireAuth)
	imoveis.Get("/", handlers.ListarImoveis)
	imoveis.Post("/", handlers.CriarImovel)
	imoveis.Get("/:imovelId/contratos/:contratoId", handlers.BaixarContratoPorId) // Baixar contrato específico
	imoveis.Get("/:id/contratos", handlers.ListarContratos)                       // Listar todos os contratos
	imoveis.Get("/:id/contrato", handlers.BaixarContratoMaisRecente)              // Baixar contrato mais recente
	imoveis.Post("/:id/pagamentos", handlers.CriarPagamento)                      // Criar pagamento
	imoveis.Put("/:id/pagamentos/:pagamentoId", handlers.AtualizarPagamento)      // Atualizar pagamento
	imoveis.Get("/:id", handlers.BuscarImovel)                                    // Detalhes (Get One)
	imoveis.Put("/:id", handlers.EditarImovel)                                    // Atualizar
}
