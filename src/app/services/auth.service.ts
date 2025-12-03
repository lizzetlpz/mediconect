// C:\Users\lizze\medicos\nombre-proyecto\src\app\services\auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const user = this.getUserFromStorage();
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  private getUserFromStorage(): User | null {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials);
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data);
  }

  loginWithGoogle(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, { token });
  }

  setCurrentUser(user: User, token: string, refreshToken: string): void {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('refreshToken', refreshToken);
    }
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): User | null {
    const user = this.currentUserSubject.value;
    // Si el usuario tiene usuario_id, asegurarse que también tenga id (mantener ambos)
    if (user && (user as any).usuario_id && !(user as any).id) {
      (user as any).id = (user as any).usuario_id;
    }
    // Si solo tiene id, agregar usuario_id también
    if (user && (user as any).id && !(user as any).usuario_id) {
      (user as any).usuario_id = (user as any).id;
    }
    return user;
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('token');
    }
    return null;
  }

  logout(): void {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
    }
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
