import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { UserService } from './services/user.service';
import { User } from './models/user.model';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let mockUserService: { getUsers: any; addUser: any; deleteUser: any };

  const mockUsers: User[] = [
    { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
    { id: 2, name: 'Alan Turing', email: 'alan@example.com' }
  ];

  beforeEach(async () => {
    mockUserService = {
      getUsers: () => of(mockUsers),
      addUser: (user: any) => of({ id: 3, ...user }),
      deleteUser: (_id: number) => of(void 0)
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty name and email', () => {
    expect(component.userForm.get('name')?.value).toBe('');
    expect(component.userForm.get('email')?.value).toBe('');
    expect(component.userForm.valid).toBe(false);
  });

  it('should load users on init', () => {
    component.ngOnInit();
    expect(component.users.length).toBe(2);
    expect(component.users[0].name).toBe('Ada Lovelace');
  });

  it('should reject invalid form submission', () => {
    component.userForm.controls['name'].setValue('');
    component.userForm.controls['email'].setValue('invalid-email');
    component.onSubmit();
    expect(component.errorMessage).toBeTruthy();
  });

  it('should add user and clear form when submission is valid', () => {
    component.userForm.controls['name'].setValue('Grace Hopper');
    component.userForm.controls['email'].setValue('grace@example.com');
    component.onSubmit();

    expect(component.users.some(u => u.name === 'Grace Hopper')).toBe(true);
    expect(component.successMessage).toContain('Grace Hopper');
  });

  it('should delete user and update users list', () => {
    component.users = [...mockUsers];
    component.deleteUser(1, 'Ada Lovelace');

    expect(component.users.length).toBe(1);
    expect(component.users.find(u => u.id === 1)).toBeUndefined();
    expect(component.successMessage).toContain('deleted successfully');
  });
});
