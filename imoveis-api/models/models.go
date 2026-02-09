package models

import (
	"time"
)

// Role do usuário: admin ou cliente
const (
	RoleAdmin   = "admin"
	RoleCliente = "cliente"
)

// User representa um usuário do sistema (admin ou cliente)
type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `json:"name"`
	Email        string    `gorm:"unique" json:"email"`
	PasswordHash string    `json:"-"`                                 // O "-" impede que a senha seja enviada no JSON de resposta
	Role         string    `json:"role" gorm:"default:admin;size:20"` // admin | cliente
	Active       bool      `json:"active" gorm:"default:true"`        // false = desativado
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Imovel reflete a tabela imoveis
type Imovel struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	UserID             *uint     `json:"user_id" gorm:"column:user_id"` // dono (cliente); null = legado/admin
	Endereco           string    `json:"endereco"`
	ValorCondominio    float64   `json:"valorCondominio"`
	ValorAluguel       float64   `json:"valorAluguel"`
	ValorIptu          float64   `json:"valorIptu"`
	ValorCaucao        float64   `json:"valorCaucao"`
	DataInicioContrato time.Time `json:"dataInicioContrato" gorm:"type:date"`
	ArquivoContrato    string    `json:"arquivoContrato"`
	InquilinoID        *uint     `json:"inquilino_id" gorm:"column:inquilino_id"`

	// Relacionamentos
	Inquilino           *Inquilino       `gorm:"foreignKey:InquilinoID" json:"inquilino,omitempty"`
	HistoricoPagamentos []Pagamento      `gorm:"foreignKey:ImovelID" json:"historicoPagamentos,omitempty"`
	HistoricoValores    []HistoricoValor `gorm:"foreignKey:ImovelID" json:"historicoValores,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Inquilino reflete ILocatario
type Inquilino struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Nome      string    `json:"nome"`
	Telefone  string    `json:"telefone"` // String é melhor para telefone
	Email     string    `json:"email"`
	ImovelID  *uint     `json:"aluguel_id"` // Ponteiro permite ser null se não tiver alugado
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// HistoricoValor armazena as alterações de preço
type HistoricoValor struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	ImovelID        uint      `json:"imovelId"`
	CampoAlterado   string    `json:"campoAlterado"` // ex: "aluguel"
	ValorAntigo     float64   `json:"valorAntigo"`
	ValorNovo       float64   `json:"valorNovo"`
	MotivoAlteracao string    `json:"motivoAlteracao"`
	DataAlteracao   time.Time `json:"dataAlteracao"`
}

// HistoricoContrato reflete arquivos antigos
type HistoricoContrato struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	ImovelID       uint      `json:"imovelId"`
	NomeArquivo    string    `json:"nomeArquivo"`
	CaminhoArquivo string    `json:"caminhoArquivo"`
	TamanhoArquivo int64     `json:"tamanhoArquivo"`
	DataInsercao   time.Time `json:"dataInsercao"`
}

// Pagamento representa um pagamento de aluguel, IPTU ou condomínio
type Pagamento struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	ImovelID       uint       `json:"imovelId"`
	InquilinoID    uint       `json:"inquilinoId"`
	Tipo           string     `json:"tipo"` // "aluguel", "iptu", "condominio"
	Valor          float64    `json:"valor"`
	DataVencimento time.Time  `json:"dataVencimento" gorm:"type:date"`
	DataPagamento  *time.Time `json:"dataPagamento,omitempty" gorm:"type:date"` // Nullable
	Status         string     `json:"status"`                                   // "pendente", "atrasado", "pago"
	MesReferencia  string     `json:"mesReferencia"`                            // Ex: "Janeiro/2024"
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`

	Inquilino *Inquilino `gorm:"foreignKey:InquilinoID" json:"inquilino,omitempty"`
}

// IndiceMensal armazena IPCA ou IGPM por mês (para histórico)
type IndiceMensal struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Tipo      string    `json:"tipo" gorm:"size:10;uniqueIndex:idx_indice_ano_mes"` // "ipca" | "igpm"
	Ano       int       `json:"ano" gorm:"uniqueIndex:idx_indice_ano_mes"`
	Mes       int       `json:"mes" gorm:"uniqueIndex:idx_indice_ano_mes"`
	Valor     float64   `json:"valor"` // percentual (ex: -1.04)
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// IndiceResumo armazena valores consolidados (acumulado 12, mês anterior) atualizados pelo scraper
type IndiceResumo struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Chave     string    `json:"chave" gorm:"uniqueIndex;size:32"` // "igpm_mes_anterior", "igpm_acumulado_12", "ipca_acumulado_12"
	Valor     float64   `json:"valor"`
	UpdatedAt time.Time `json:"updated_at"`
}
