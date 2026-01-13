package database

import (
	"fmt"
	"log"
	"os"

	"imoveis-api/models" // Importando suas structs

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() {
	// Monta a string de conexão (DSN)
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=America/Sao_Paulo",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	var err error
	// Conecta ao banco
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info), // Mostra SQL no terminal
	})

	if err != nil {
		log.Fatal("Falha ao conectar ao banco de dados. \n", err)
	}

	log.Println("Conectado ao banco de dados com sucesso!")

	// Executa as migrações (Cria as tabelas automaticamente)
	log.Println("Rodando migrações...")
	err = DB.AutoMigrate(
		&models.User{},
		&models.Imovel{},
		&models.Inquilino{},
		&models.HistoricoValor{},
		&models.HistoricoContrato{},
		&models.Pagamento{},
	)
	if err != nil {
		log.Fatal("Falha na migração: ", err)
	}
	
	log.Println("Banco de dados migrado com sucesso!")
}