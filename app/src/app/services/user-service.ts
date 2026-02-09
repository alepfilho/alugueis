import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, throwError } from 'rxjs';
import { IUser } from '../Interfaces/IUser';
import { API_CONFIG } from '../config/api.config';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: IUser;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userSubject = new BehaviorSubject<IUser | null>(null);
  private readonly TOKEN_KEY = 'auth_token';

  user$: Observable<IUser | null> = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    // Recupera o token e usuário do localStorage ao inicializar
    const token = this.getToken();
    const user = this.getStoredUser();
    if (token && user) {
      this.userSubject.next(user);
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_CONFIG.baseUrl}/auth/login`, credentials)
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  setUser(user: IUser) {
    this.userSubject.next(user);
    this.storeUser(user);
  }

  setToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  clearUser() {
    this.userSubject.next(null);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('user');
  }

  getUserValue(): IUser | null {
    return this.userSubject.value;
  }

  private storeUser(user: IUser) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  private getStoredUser(): IUser | null {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (user && !user.role) {
      user.role = 'admin';
    }
    return user;
  }

  createCliente(nome: string, email: string, senha: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_CONFIG.baseUrl}/auth/users`, {
      name: nome,
      email,
      password: senha
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /** Lista clientes (apenas admin). */
  listClientes(): Observable<IClienteListItem[]> {
    return this.http.get<IClienteListItem[]>(`${API_CONFIG.baseUrl}/users`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /** Atualiza cliente (apenas admin). Senha opcional. */
  updateCliente(id: number, data: { name?: string; email?: string; password?: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${API_CONFIG.baseUrl}/users/${id}`, data).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /** Desativa cliente e exclui imóveis e inquilinos dele (apenas admin). */
  deactivateCliente(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_CONFIG.baseUrl}/users/${id}/deactivate`, {}).pipe(
      catchError(error => throwError(() => error))
    );
  }
}

export interface IClienteListItem {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}
