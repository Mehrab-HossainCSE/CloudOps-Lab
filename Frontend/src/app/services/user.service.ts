import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { User, CreateUserRequest, UpdateUserRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private _isOnline = false;

  // Initial sample users so user management data is visible even when backend is offline
  private mockUsers: User[] = [
    { id: 1, name: 'Sarah ConnorFrontend', email: 'sarah.connor@example.com' },
    { id: 2, name: 'John DoeFrontend', email: 'john.doe@example.com' },
    { id: 3, name: 'Jane SmithFrontend', email: 'jane.smith@example.com' }
  ];
  private nextMockId = 4;

  private apiUrl = '/api/users';

  private readonly FRONTEND_PREFIX = "[it's come from frontend] ";
  private readonly BACKEND_PREFIX = '[this data come from backend] ';

  get isOnline(): boolean {
    return this._isOnline;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  setApiUrl(url: string): void {
    this.apiUrl = url;
  }

  private cleanName(name: string): string {
    if (!name) return '';
    return name
      .replace(/^\[it's come from frontend\]\s*/i, '')
      .replace(/^\[this data come from backend\]\s*/i, '')
      .replace(/UserFromFRontend$/i, '')
      .replace(/EmployeeFromFRontend$/i, '')
      .trim();
  }

  private formatFrontendName(name: string): string {
    return `${this.FRONTEND_PREFIX}${this.cleanName(name)}`;
  }

  private formatBackendName(name: string): string {
    return `${this.BACKEND_PREFIX}${this.cleanName(name)}`;
  }

  /**
   * Fetch all users from the backend API.
   * If backend is offline or returns error, falls back to sample user data.
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      map((users) => {
        this._isOnline = true;
        return users.map((u) => ({
          ...u,
          name: this.formatBackendName(u.name)
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 500) {
          this._isOnline = false;
          console.warn('Backend API unavailable. Displaying sample user data.', error.message);
          return of(
            this.mockUsers.map((u) => ({
              ...u,
              name: this.formatFrontendName(u.name)
            }))
          );
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Add a new user via POST /api/users.
   * If backend is offline, persists to local mock store.
   */
  addUser(user: CreateUserRequest): Observable<User> {
    const payload: CreateUserRequest = {
      name: this.cleanName(user.name),
      email: user.email.trim()
    };
    return this.http.post<User>(this.apiUrl, payload).pipe(
      map((created) => {
        this._isOnline = true;
        return {
          ...created,
          name: this.formatBackendName(created.name)
        };
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 500) {
          this._isOnline = false;
          const created: User = {
            id: this.nextMockId++,
            name: this.formatFrontendName(user.name),
            email: user.email.trim()
          };
          this.mockUsers = [...this.mockUsers, created];
          return of(created);
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Update an existing user via PUT /api/users/{id}.
   */
  updateUser(id: number, user: UpdateUserRequest): Observable<User> {
    const payload: UpdateUserRequest = {
      name: this.cleanName(user.name),
      email: user.email.trim()
    };
    return this.http.put<User>(`${this.apiUrl}/${id}`, payload).pipe(
      map((updated) => {
        this._isOnline = true;
        return {
          ...updated,
          name: this.formatBackendName(updated.name)
        };
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 500) {
          this._isOnline = false;
          const updatedUser: User = {
            id,
            name: this.formatFrontendName(user.name),
            email: user.email.trim()
          };
          const index = this.mockUsers.findIndex((u) => u.id === id);
          if (index !== -1) {
            this.mockUsers[index] = updatedUser;
          } else {
            this.mockUsers = [...this.mockUsers, updatedUser];
          }
          return of(updatedUser);
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Delete a user by ID via DELETE /api/users/{id}.
   * If backend is offline, removes from local mock store.
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      map(() => {
        this._isOnline = true;
        return void 0;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 500) {
          this._isOnline = false;
          this.mockUsers = this.mockUsers.filter((u) => u.id !== id);
          return of(void 0);
        }
        return this.handleError(error);
      })
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.status === 0) {
      errorMessage = 'Cannot connect to backend server. Make sure the API is running at http://localhost:5000.';
    } else if (error.error) {
      if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error.errors) {
        const validationMsgs = Object.values(error.error.errors).flat();
        errorMessage = validationMsgs.join(' ');
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
