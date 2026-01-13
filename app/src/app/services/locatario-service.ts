import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { ILocatario } from '../Interfaces/Ilocatario';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class LocatarioService {
  constructor(private http: HttpClient) {}

  getLocatarios(): Observable<ILocatario[]> {
    return this.http.get<ILocatario[]>(`${API_CONFIG.baseUrl}/inquilinos`)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  getLocatarioById(id: number): Observable<ILocatario> {
    return this.http.get<ILocatario>(`${API_CONFIG.baseUrl}/inquilinos/${id}`)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  updateLocatario(id: number, locatario: Partial<ILocatario>): Observable<ILocatario> {
    return this.http.put<ILocatario>(`${API_CONFIG.baseUrl}/inquilinos/${id}`, locatario)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  createLocatario(locatario: Partial<ILocatario>): Observable<ILocatario> {
    return this.http.post<ILocatario>(`${API_CONFIG.baseUrl}/inquilinos`, locatario)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }
}
