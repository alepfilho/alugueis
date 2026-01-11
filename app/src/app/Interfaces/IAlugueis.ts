export interface IAlugueis {
    id: string,
    endereco: string,
    valor_aluguel: number,
    data_inicio: string,
    status_iptu: boolean,
    status_aluguel: boolean,
    status_condominio: boolean,
    inquilino: string,
    inquilino_id: string
  }