package models

import (
	"time"
)

// User representa o administrador do sistema
type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `json:"name"`
	Email        string    `gorm:"unique" json:"email"`
	PasswordHash string    `json:"-"` // O "-" impede que a senha seja enviada no JSON de resposta
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Imovel reflete a tabela imoveis
type Imovel struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
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
}
