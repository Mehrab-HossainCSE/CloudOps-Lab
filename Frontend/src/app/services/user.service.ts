import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { User, CreateUserRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);

  // Initial sample users so user management data is visible even when backend is offline
  private mockUsers: User[] = [
    { id: 1, name: 'Sarah Connor', email: 'sarah.connor@example.com' },
    { id: 2, name: 'John Doe', email: 'john.doe@example.com' },
    { id: 3, name: 'Jane Smith', email: 'jane.smith@example.com' }
  ];
  private nextMockId = 4;

  // When running ng serve on port 4200, target backend at localhost:5000.
  // In Docker / Production behind reverse proxy, target /api/users directly.
  private readonly apiUrl = typeof window !== 'undefined' && window.location.port === '4200'
    ? 'http://localhost:5000/api/users'
    : '/api/users';

  /**
   * Fetch all users from the backend API.
   * If backend is offline or returns error, falls back to sample user data.
   */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 500) {
          console.warn('Backend API unavailable. Displaying sample user data.', error.message);
          return of([...this.mockUsers]);
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
    return this.http.post<User>(this.apiUrl, user).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 500) {
          const created: User = {
            id: this.nextMockId++,
            name: user.name.trim(),
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
   * Delete a user by ID via DELETE /api/users/{id}.
   * If backend is offline, removes from local mock store.
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 500) {
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
        // Validation errors dictionary
        const validationMsgs = Object.values(error.error.errors).flat();
        errorMessage = validationMsgs.join(' ');
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
