import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from './services/user.service';
import { User } from './models/user.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  userForm: FormGroup;
  users: User[] = [];
  isLoading = false;
  isSubmitting = false;
  deletingUserId: number | null = null;

  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor() {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(250)]]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  // Getters for easy form field access in template
  get name() {
    return this.userForm.get('name');
  }

  get email() {
    return this.userForm.get('email');
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
      },
      error: (err: Error) => {
        this.showError(`Failed to load users: ${err.message}`);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.showError('Please fill out all required fields with valid values.');
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const request = {
      name: this.userForm.value.name.trim(),
      email: this.userForm.value.email.trim()
    };

    this.userService.addUser(request).subscribe({
      next: (createdUser) => {
        this.users = [...this.users, createdUser];
        this.userForm.reset();
        this.isSubmitting = false;
        this.showSuccess(`User "${createdUser.name}" added successfully! (ID: ${createdUser.id})`);
      },
      error: (err: Error) => {
        this.showError(`Failed to add user: ${err.message}`);
        this.isSubmitting = false;
      }
    });
  }

  confirmDelete(id: number, name: string): void {
    if (confirm(`Are you sure you want to delete user "${name}" (ID: ${id})?`)) {
      this.deleteUser(id, name);
    }
  }

  deleteUser(id: number, name: string): void {
    this.deletingUserId = id;
    this.clearMessages();

    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.users = this.users.filter((u) => u.id !== id);
        this.deletingUserId = null;
        this.showSuccess(`User "${name}" (ID: ${id}) was deleted successfully.`);
      },
      error: (err: Error) => {
        this.showError(`Failed to delete user: ${err.message}`);
        this.deletingUserId = null;
      }
    });
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = null;
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = null;
  }

  clearMessages(): void {
    this.successMessage = null;
    this.errorMessage = null;
  }
}
