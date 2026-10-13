import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { UserService } from './services/user.service';
import { EmployeeService } from './services/employee.service';
import { User, CreateUserRequest, UpdateUserRequest } from './models/user.model';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from './models/employee.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly userService = inject(UserService);
  readonly employeeService = inject(EmployeeService);

  // ==========================================
  // Left Panel: User Management State (D:\AWSProject\MonitoringWithCICD\Backend)
  // ==========================================
  userForm: FormGroup;
  users: User[] = [];
  isLoadingUsers = false;
  isSubmittingUser = false;
  deletingUserId: number | null = null;
  editingUser: User | null = null;
  userSearchTerm = '';
  isEditingUserEndpoint = false;
  customUserEndpoint = '';

  userSuccessMessage: string | null = null;
  userErrorMessage: string | null = null;

  // ==========================================
  // Right Panel: Employee Management State (D:\AWSProject\Backend)
  // ==========================================
  employeeForm: FormGroup;
  employees: Employee[] = [];
  isLoadingEmployees = false;
  isSubmittingEmployee = false;
  deletingEmployeeId: number | null = null;
  editingEmployee: Employee | null = null;
  employeeSearchTerm = '';
  isEditingEmployeeEndpoint = false;
  customEmployeeEndpoint = '';

  employeeSuccessMessage: string | null = null;
  employeeErrorMessage: string | null = null;

  constructor() {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(250)]],
    });

    this.employeeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(250)]],
    });

    this.customUserEndpoint = this.userService.getApiUrl();
    this.customEmployeeEndpoint = this.employeeService.getApiUrl();
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadEmployees();
  }

  // ==========================================
  // Getters for User Form & Filtering
  // ==========================================
  get name() {
    return this.userForm.get('name');
  }

  get email() {
    return this.userForm.get('email');
  }

  get filteredUsers(): User[] {
    const term = this.userSearchTerm.trim().toLowerCase();
    if (!term) return this.users;
    return this.users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.id.toString().includes(term),
    );
  }

  get isUserOnline(): boolean {
    return this.userService.isOnline;
  }

  get userApiUrl(): string {
    return this.userService.getApiUrl();
  }

  // Backward-compatibility properties/getters
  get isLoading(): boolean {
    return this.isLoadingUsers;
  }
  set isLoading(val: boolean) {
    this.isLoadingUsers = val;
  }

  get isSubmitting(): boolean {
    return this.isSubmittingUser;
  }
  set isSubmitting(val: boolean) {
    this.isSubmittingUser = val;
  }

  get successMessage(): string | null {
    return this.userSuccessMessage;
  }
  set successMessage(val: string | null) {
    this.userSuccessMessage = val;
  }

  get errorMessage(): string | null {
    return this.userErrorMessage;
  }
  set errorMessage(val: string | null) {
    this.userErrorMessage = val;
  }

  // ==========================================
  // Getters for Employee Form & Filtering
  // ==========================================
  get employeeName() {
    return this.employeeForm.get('name');
  }

  get employeeEmail() {
    return this.employeeForm.get('email');
  }

  get filteredEmployees(): Employee[] {
    const term = this.employeeSearchTerm.trim().toLowerCase();
    if (!term) return this.employees;
    return this.employees.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        e.id.toString().includes(term),
    );
  }

  get isEmployeeOnline(): boolean {
    return this.employeeService.isOnline;
  }

  get employeeApiUrl(): string {
    return this.employeeService.getApiUrl();
  }

  // ==========================================
  // Endpoint Customization Methods
  // ==========================================
  saveUserEndpoint(): void {
    if (this.customUserEndpoint.trim()) {
      this.userService.setApiUrl(this.customUserEndpoint.trim());
      this.isEditingUserEndpoint = false;
      this.loadUsers();
      this.showUserSuccess(`User endpoint updated to: ${this.userService.getApiUrl()}`);
    }
  }

  saveEmployeeEndpoint(): void {
    if (this.customEmployeeEndpoint.trim()) {
      this.employeeService.setApiUrl(this.customEmployeeEndpoint.trim());
      this.isEditingEmployeeEndpoint = false;
      this.loadEmployees();
      this.showEmployeeSuccess(`Employee endpoint updated to: ${this.employeeService.getApiUrl()}`);
    }
  }

  // ==========================================
  // User Management CRUD Methods
  // ==========================================
  loadUsers(): void {
    this.isLoadingUsers = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoadingUsers = false;
      },
      error: (err: Error) => {
        this.showUserError(`Failed to load users: ${err.message}`);
        this.isLoadingUsers = false;
      },
    });
  }

  onSubmitUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.showUserError('Please fill out all required fields with valid values.');
      return;
    }

    this.isSubmittingUser = true;
    this.clearUserMessages();

    const name = this.userForm.value.name.trim();
    const email = this.userForm.value.email.trim();

    if (this.editingUser) {
      // UPDATE Operation (PUT)
      const updatePayload: UpdateUserRequest = { name, email };
      const userId = this.editingUser.id;

      this.userService.updateUser(userId, updatePayload).subscribe({
        next: (updatedUser) => {
          this.users = this.users.map((u) => (u.id === userId ? updatedUser : u));
          this.userForm.reset();
          this.editingUser = null;
          this.isSubmittingUser = false;
          this.showUserSuccess(
            `User "${updatedUser.name}" (ID: ${updatedUser.id}) updated successfully!`,
          );
        },
        error: (err: Error) => {
          this.showUserError(`Failed to update user: ${err.message}`);
          this.isSubmittingUser = false;
        },
      });
    } else {
      // CREATE Operation (POST)
      const createPayload: CreateUserRequest = { name, email };

      this.userService.addUser(createPayload).subscribe({
        next: (createdUser) => {
          this.users = [...this.users, createdUser];
          this.userForm.reset();
          this.isSubmittingUser = false;
          this.showUserSuccess(
            `User "${createdUser.name}" added successfully! (ID: ${createdUser.id})`,
          );
        },
        error: (err: Error) => {
          this.showUserError(`Failed to add user: ${err.message}`);
          this.isSubmittingUser = false;
        },
      });
    }
  }

  // Alias for backward compatibility
  onSubmit(): void {
    this.onSubmitUser();
  }

  startEditUser(user: User): void {
    this.editingUser = user;
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
    });
    this.clearUserMessages();
  }

  cancelEditUser(): void {
    this.editingUser = null;
    this.userForm.reset();
    this.clearUserMessages();
  }

  confirmDeleteUser(id: number, name: string): void {
    if (confirm(`Are you sure you want to delete user "${name}" (ID: ${id})?`)) {
      this.deleteUser(id, name);
    }
  }

  // Alias for backward compatibility
  confirmDelete(id: number, name: string): void {
    this.confirmDeleteUser(id, name);
  }

  deleteUser(id: number, name?: string): void {
    this.deletingUserId = id;
    this.clearUserMessages();
    const displayName = name ?? this.users.find((u) => u.id === id)?.name ?? `#${id}`;

    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u.id !== id);
        if (this.editingUser?.id === id) {
          this.cancelEditUser();
        }
        this.deletingUserId = null;
        this.showUserSuccess(`User "${displayName}" (ID: ${id}) was deleted successfully.`);
      },
      error: (err: Error) => {
        this.showUserError(`Failed to delete user: ${err.message}`);
        this.deletingUserId = null;
      },
    });
  }

  showUserSuccess(message: string): void {
    this.userSuccessMessage = message;
    this.userErrorMessage = null;
  }

  showUserError(message: string): void {
    this.userErrorMessage = message;
    this.userSuccessMessage = null;
  }

  clearUserMessages(): void {
    this.userSuccessMessage = null;
    this.userErrorMessage = null;
  }

  // ==========================================
  // Employee Management CRUD Methods
  // ==========================================
  loadEmployees(): void {
    this.isLoadingEmployees = true;
    this.employeeService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;
        this.isLoadingEmployees = false;
      },
      error: (err: Error) => {
        this.showEmployeeError(`Failed to load employees: ${err.message}`);
        this.isLoadingEmployees = false;
      },
    });
  }

  onSubmitEmployee(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      this.showEmployeeError('Please fill out all required fields with valid values.');
      return;
    }

    this.isSubmittingEmployee = true;
    this.clearEmployeeMessages();

    const name = this.employeeForm.value.name.trim();
    const email = this.employeeForm.value.email.trim();

    if (this.editingEmployee) {
      // UPDATE Operation (PUT)
      const updatePayload: UpdateEmployeeRequest = { name, email };
      const empId = this.editingEmployee.id;

      this.employeeService.updateEmployee(empId, updatePayload).subscribe({
        next: (updatedEmp) => {
          this.employees = this.employees.map((e) => (e.id === empId ? updatedEmp : e));
          this.employeeForm.reset();
          this.editingEmployee = null;
          this.isSubmittingEmployee = false;
          this.showEmployeeSuccess(
            `Employee "${updatedEmp.name}" (ID: ${updatedEmp.id}) updated successfully!`,
          );
        },
        error: (err: Error) => {
          this.showEmployeeError(`Failed to update employee: ${err.message}`);
          this.isSubmittingEmployee = false;
        },
      });
    } else {
      // CREATE Operation (POST)
      const createPayload: CreateEmployeeRequest = { name, email };

      this.employeeService.addEmployee(createPayload).subscribe({
        next: (createdEmp) => {
          this.employees = [...this.employees, createdEmp];
          this.employeeForm.reset();
          this.isSubmittingEmployee = false;
          this.showEmployeeSuccess(
            `Employee "${createdEmp.name}" added successfully! (ID: ${createdEmp.id})`,
          );
        },
        error: (err: Error) => {
          this.showEmployeeError(`Failed to add employee: ${err.message}`);
          this.isSubmittingEmployee = false;
        },
      });
    }
  }

  startEditEmployee(emp: Employee): void {
    this.editingEmployee = emp;
    this.employeeForm.patchValue({
      name: emp.name,
      email: emp.email,
    });
    this.clearEmployeeMessages();
  }

  cancelEditEmployee(): void {
    this.editingEmployee = null;
    this.employeeForm.reset();
    this.clearEmployeeMessages();
  }

  confirmDeleteEmployee(id: number, name: string): void {
    if (confirm(`Are you sure you want to delete employee "${name}" (ID: ${id})?`)) {
      this.deleteEmployee(id, name);
    }
  }

  deleteEmployee(id: number, name?: string): void {
    this.deletingEmployeeId = id;
    this.clearEmployeeMessages();
    const displayName = name ?? this.employees.find((e) => e.id === id)?.name ?? `#${id}`;

    this.employeeService.deleteEmployee(id).subscribe({
      next: () => {
        this.employees = this.employees.filter((e) => e.id !== id);
        if (this.editingEmployee?.id === id) {
          this.cancelEditEmployee();
        }
        this.deletingEmployeeId = null;
        this.showEmployeeSuccess(`Employee "${displayName}" (ID: ${id}) was deleted successfully.`);
      },
      error: (err: Error) => {
        this.showEmployeeError(`Failed to delete employee: ${err.message}`);
        this.deletingEmployeeId = null;
      },
    });
  }

  showEmployeeSuccess(message: string): void {
    this.employeeSuccessMessage = message;
    this.employeeErrorMessage = null;
  }

  showEmployeeError(message: string): void {
    this.employeeErrorMessage = message;
    this.employeeSuccessMessage = null;
  }

  clearEmployeeMessages(): void {
    this.employeeSuccessMessage = null;
    this.employeeErrorMessage = null;
  }

  // Global backward-compatibility helper methods
  showSuccess(message: string): void {
    this.showUserSuccess(message);
  }

  showError(message: string): void {
    this.showUserError(message);
  }

  clearMessages(): void {
    this.clearUserMessages();
    this.clearEmployeeMessages();
  }
}
