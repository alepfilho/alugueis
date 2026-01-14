import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface IInquilino {
  id?: number;
  nome: string;
  telefone: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface IImovel {
  id?: number;
  endereco: string;
  valorAluguel: number;
  valorCondominio: number;
  valorIptu: number;
  valorCaucao: number;
  dataInicioContrato: string;
  arquivoContrato: string;
  inquilino_id?: number | null;
  inquilino?: IInquilino | null;
  historicoPagamentos?: IPagamento[];
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImovelService {
  constructor(private http: HttpClient) { }

  createImovel(imovel: Partial<IImovel>, arquivo?: File): Observable<IImovel> {
    // Se houver arquivo, envia como FormData
    if (arquivo) {
      const formData = new FormData();
      formData.append('endereco', imovel.endereco || '');
      formData.append('valorAluguel', String(imovel.valorAluguel || 0));
      formData.append('valorCondominio', String(imovel.valorCondominio || 0));
      formData.append('valorIptu', String(imovel.valorIptu || 0));
      formData.append('valorCaucao', String(imovel.valorCaucao || 0));
      formData.append('dataInicioContrato', imovel.dataInicioContrato || '');
      if (imovel.inquilino_id) {
        formData.append('locatarioId', String(imovel.inquilino_id));
      }
      formData.append('arquivoContrato', arquivo);

      return this.http.post<IImovel>(`${API_CONFIG.baseUrl}/imoveis`, formData)
        .pipe(
          catchError(error => {
            return throwError(() => error);
          })
        );
    }

    // Caso contrário, envia como JSON
    return this.http.post<IImovel>(`${API_CONFIG.baseUrl}/imoveis`, imovel)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  getAllImoveis(): Observable<IImovel[]> {
    return this.http.get<IImovel[]>(`${API_CONFIG.baseUrl}/imoveis`)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  getImovelById(id: number): Observable<IImovel> {
    return this.http.get<IImovel>(`${API_CONFIG.baseUrl}/imoveis/${id}`)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  updateImovel(id: number, imovel: Partial<IImovel>): Observable<IImovel> {
    return this.http.put<IImovel>(`${API_CONFIG.baseUrl}/imoveis/${id}`, imovel)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  downloadContrato(id: number): Observable<Blob> {
    return this.http.get(`${API_CONFIG.baseUrl}/imoveis/${id}/contrato`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  getContratos(id: number): Observable<IHistoricoContrato[]> {
    return this.http.get<IHistoricoContrato[]>(`${API_CONFIG.baseUrl}/imoveis/${id}/contratos`)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  downloadContratoPorId(imovelId: number, contratoId: number): Observable<Blob> {
    return this.http.get(`${API_CONFIG.baseUrl}/imoveis/${imovelId}/contratos/${contratoId}`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  salvarPagamento(imovelId: number, pagamento: {
    tipo: 'aluguel' | 'iptu' | 'condominio';
    valor: number;
    dataVencimento: string;
    status: 'pendente' | 'atrasado' | 'pago';
    mesReferencia: string;
  }): Observable<IPagamento> {
    return this.http.post<IPagamento>(`${API_CONFIG.baseUrl}/imoveis/${imovelId}/pagamentos`, pagamento)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  atualizarPagamento(imovelId: number, pagamentoId: number, pagamento: {
    tipo: 'aluguel' | 'iptu' | 'condominio';
    valor: number;
    dataVencimento: string;
    status: 'pendente' | 'atrasado' | 'pago';
    mesReferencia: string;
    dataPagamento?: string | null;
  }): Observable<IPagamento> {
    return this.http.put<IPagamento>(`${API_CONFIG.baseUrl}/imoveis/${imovelId}/pagamentos/${pagamentoId}`, pagamento)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }
}

export interface IPagamento {
  id: number;
  tipo: 'aluguel' | 'iptu' | 'condominio';
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  status: 'pendente' | 'atrasado' | 'pago';
  mesReferencia: string;
  imovelId: number;
  inquilinoId: number;
  created_at?: string;
  updated_at?: string;
}

export interface IHistoricoContrato {
  id: number;
  imovelId: number;
  nomeArquivo: string;
  caminhoArquivo: string;
  tamanhoArquivo: number;
  dataInsercao: string;
}
