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
    return userStr ? JSON.parse(userStr) : null;
  }
}
