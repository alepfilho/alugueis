import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface IImovel {
  id?: number;
  endereco: string;
  valorAluguel: number;
  valorCondominio: number;
  valorIptu: number;
  valorCaucao: number;
  dataInicioContrato: string;
  arquivoContrato: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImovelService {
  constructor(private http: HttpClient) { }

  createImovel(imovel: Partial<IImovel>): Observable<IImovel> {
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
}
