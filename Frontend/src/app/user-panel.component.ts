import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { User, CreateUserRequest } from './models/user.model';

export interface UserApi {
  getUsers(): Observable<User[]>;
  addUser(user: CreateUserRequest): Observable<User>;
  deleteUser(id: number): Observable<void>;
}

@Component({
  selector: 'app-user-panel',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './user-panel.component.html',
  styleUrl: './user-panel.component.css'
})
export class UserPanelComponent implements OnInit {
  @Input({ required: true }) api!: UserApi;
  @Input() title = 'Users';
  @Input() key = 'user'; // keeps input ids unique when rendered twice

  users: User[] = [];
  isLoading = false;
  isSubmitting = false;
  deletingUserId: number | null = null;
  successMessage = '';
  errorMessage = '';

  private readonly fb = inject(FormBuilder);

  userForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(250)]]
  });

  get name() { return this.userForm.get('name'); }
  get email() { return this.userForm.get('email'); }

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.isLoading = true;
    this.api.getUsers().subscribe({
      next: (u) => { this.users = u; this.isLoading = false; },
      error: (e) => { this.errorMessage = e.message; this.isLoading = false; }
    });
  }

  onSubmit() {
    if (this.userForm.invalid) return;
    this.isSubmitting = true;
    this.clearMessages();
    this.api.addUser(this.userForm.value as CreateUserRequest).subscribe({
      next: (created) => {
        this.users = [...this.users, created];
        this.successMessage = `${created.name} added.`;
        this.userForm.reset();
        this.isSubmitting = false;
      },
      error: (e) => { this.errorMessage = e.message; this.isSubmitting = false; }
    });
  }

  confirmDelete(id: number, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    this.deletingUserId = id;
    this.clearMessages();
    this.api.deleteUser(id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== id);
        this.successMessage = `${name} deleted.`;
        this.deletingUserId = null;
      },
      error: (e) => { this.errorMessage = e.message; this.deletingUserId = null; }
    });
  }

  clearMessages() { this.successMessage = ''; this.errorMessage = ''; }
}