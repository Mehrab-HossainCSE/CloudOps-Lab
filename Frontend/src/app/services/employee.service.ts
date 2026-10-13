import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { User, CreateUserRequest } from '../models/user.model';
import {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private _isOnline = false;

  // Initial sample employees so data is visible even when backend is offline
  private mockEmployees: Employee[] = [
    { id: 1, name: 'Sarah ConnorFrontend', email: 'sarah.connor@example.com' },
    { id: 2, name: 'John DoeFrontend', email: 'john.doe@example.com' },
    { id: 3, name: 'Jane SmithFrontend', email: 'jane.smith@example.com' }
  ];
  private nextMockId = 4;

  private apiUrl = '/api/employees';

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
   * Fetch all employees from the backend API.
   * If backend is offline or returns error, falls back to sample employee data.
   */
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.apiUrl).pipe(
      map((employees) => {
        this._isOnline = true;
        return employees.map((e) => ({
          ...e,
          name: this.formatBackendName(e.name)
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 500) {
          this._isOnline = false;
          console.warn('Backend API unavailable. Displaying sample employee data.', error.message);
          return of(
            this.mockEmployees.map((e) => ({
              ...e,
              name: this.formatFrontendName(e.name)
            }))
          );
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Add a new employee via POST /api/employees.
   */
  addEmployee(employee: CreateEmployeeRequest): Observable<Employee> {
    const payload: CreateEmployeeRequest = {
      name: this.cleanName(employee.name),
      email: employee.email.trim()
    };
    return this.http.post<Employee>(this.apiUrl, payload).pipe(
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
          const created: Employee = {
            id: this.nextMockId++,
            name: this.formatFrontendName(employee.name),
            email: employee.email.trim()
          };
          this.mockEmployees = [...this.mockEmployees, created];
          return of(created);
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Update an existing employee via PUT /api/employees/{id}.
   */
  updateEmployee(id: number, employee: UpdateEmployeeRequest): Observable<Employee> {
    const payload: UpdateEmployeeRequest = {
      name: this.cleanName(employee.name),
      email: employee.email.trim()
    };
    return this.http.put<Employee>(`${this.apiUrl}/${id}`, payload).pipe(
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
          const updatedEmp: Employee = {
            id,
            name: this.formatFrontendName(employee.name),
            email: employee.email.trim()
          };
          const index = this.mockEmployees.findIndex((e) => e.id === id);
          if (index !== -1) {
            this.mockEmployees[index] = updatedEmp;
          } else {
            this.mockEmployees = [...this.mockEmployees, updatedEmp];
          }
          return of(updatedEmp);
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Delete an employee by ID via DELETE /api/employees/{id}.
   */
  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      map(() => {
        this._isOnline = true;
        return void 0;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 500) {
          this._isOnline = false;
          this.mockEmployees = this.mockEmployees.filter((e) => e.id !== id);
          return of(void 0);
        }
        return this.handleError(error);
      })
    );
  }

  // UserApi compatibility methods for reusable panel components
  getUsers(): Observable<User[]> {
    return this.getEmployees() as Observable<User[]>;
  }

  addUser(user: CreateUserRequest): Observable<User> {
    return this.addEmployee(user) as Observable<User>;
  }

  deleteUser(id: number): Observable<void> {
    return this.deleteEmployee(id);
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
