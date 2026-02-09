export interface ILocatario {
    id: number,
    nome: string,
    telefone: string,
    email: string,
    aluguel_id?: string | number | null,
    created_at?: string,
    updated_at?: string
}