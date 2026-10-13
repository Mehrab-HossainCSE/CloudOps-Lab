import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { UserService } from './services/user.service';
import { EmployeeService } from './services/employee.service';
import { User } from './models/user.model';
import { Employee } from './models/employee.model';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let mockUserService: {
    getUsers: any;
    addUser: any;
    updateUser: any;
    deleteUser: any;
    getApiUrl: any;
    setApiUrl: any;
    isOnline: boolean;
  };
  let mockEmployeeService: {
    getEmployees: any;
    addEmployee: any;
    updateEmployee: any;
    deleteEmployee: any;
    getApiUrl: any;
    setApiUrl: any;
    isOnline: boolean;
  };

  const mockUsers: User[] = [
    { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
    { id: 2, name: 'Alan Turing', email: 'alan@example.com' },
  ];

  const mockEmployees: Employee[] = [
    { id: 1, name: 'Sarah Connor Employee', email: 'sarah.connor@example.com' },
    { id: 2, name: 'John Doe Employee', email: 'john.doe@example.com' },
  ];

  beforeEach(async () => {
    let userUrl = '/api/users';
    let empUrl = 'http://localhost:5001/api/users';

    mockUserService = {
      isOnline: true,
      getApiUrl: () => userUrl,
      setApiUrl: (url: string) => {
        userUrl = url;
      },
      getUsers: () => of([...mockUsers]),
      addUser: (user: any) => of({ id: 3, ...user }),
      updateUser: (id: number, user: any) => of({ id, ...user }),
      deleteUser: (_id: number) => of(void 0),
    };

    mockEmployeeService = {
      isOnline: true,
      getApiUrl: () => empUrl,
      setApiUrl: (url: string) => {
        empUrl = url;
      },
      getEmployees: () => of([...mockEmployees]),
      addEmployee: (emp: any) => of({ id: 3, ...emp }),
      updateEmployee: (id: number, emp: any) => of({ id, ...emp }),
      deleteEmployee: (_id: number) => of(void 0),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: EmployeeService, useValue: mockEmployeeService },
      ],
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

    expect(component.employeeForm.get('name')?.value).toBe('');
    expect(component.employeeForm.get('email')?.value).toBe('');
    expect(component.employeeForm.valid).toBe(false);
  });

  it('should load users and employees on init', () => {
    component.ngOnInit();
    expect(component.users.length).toBe(2);
    expect(component.users[0].name).toBe('Ada Lovelace');

    expect(component.employees.length).toBe(2);
    expect(component.employees[0].name).toBe('Sarah Connor Employee');
  });

  describe('User Management CRUD', () => {
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

      expect(component.users.some((u) => u.name === 'Grace Hopper')).toBe(true);
      expect(component.userSuccessMessage).toContain('Grace Hopper');
    });

    it('should update user when in edit mode', () => {
      component.users = [...mockUsers];
      const targetUser = component.users[0];
      component.startEditUser(targetUser);

      expect(component.editingUser).toEqual(targetUser);
      expect(component.userForm.value.name).toBe('Ada Lovelace');

      component.userForm.controls['name'].setValue('Ada Lovelace Updated');
      component.onSubmitUser();

      expect(component.editingUser).toBeNull();
      expect(component.users[0].name).toBe('Ada Lovelace Updated');
      expect(component.userSuccessMessage).toContain('updated successfully');
    });

    it('should cancel edit user', () => {
      component.startEditUser(mockUsers[0]);
      expect(component.editingUser).not.toBeNull();
      component.cancelEditUser();
      expect(component.editingUser).toBeNull();
      expect(component.userForm.value.name).toBeNull();
    });

    it('should delete user and update users list', () => {
      component.users = [...mockUsers];
      component.deleteUser(1, 'Ada Lovelace');

      expect(component.users.length).toBe(1);
      expect(component.users.find((u) => u.id === 1)).toBeUndefined();
      expect(component.userSuccessMessage).toContain('deleted successfully');
    });

    it('should filter users by search term', () => {
      component.users = [...mockUsers];
      component.userSearchTerm = 'ada';
      expect(component.filteredUsers.length).toBe(1);
      expect(component.filteredUsers[0].name).toBe('Ada Lovelace');
    });
  });

  describe('Employee Management CRUD', () => {
    it('should reject invalid employee form submission', () => {
      component.employeeForm.controls['name'].setValue('');
      component.employeeForm.controls['email'].setValue('invalid-email');
      component.onSubmitEmployee();
      expect(component.employeeErrorMessage).toBeTruthy();
    });

    it('should add employee and clear form when submission is valid', () => {
      component.employeeForm.controls['name'].setValue('Linus Torvalds');
      component.employeeForm.controls['email'].setValue('linus@example.com');
      component.onSubmitEmployee();

      expect(component.employees.some((e) => e.name === 'Linus Torvalds')).toBe(true);
      expect(component.employeeSuccessMessage).toContain('Linus Torvalds');
    });

    it('should update employee when in edit mode', () => {
      component.employees = [...mockEmployees];
      const targetEmp = component.employees[0];
      component.startEditEmployee(targetEmp);

      expect(component.editingEmployee).toEqual(targetEmp);
      expect(component.employeeForm.value.name).toBe('Sarah Connor Employee');

      component.employeeForm.controls['name'].setValue('Sarah Connor Senior');
      component.onSubmitEmployee();

      expect(component.editingEmployee).toBeNull();
      expect(component.employees[0].name).toBe('Sarah Connor Senior');
      expect(component.employeeSuccessMessage).toContain('updated successfully');
    });

    it('should cancel edit employee', () => {
      component.startEditEmployee(mockEmployees[0]);
      expect(component.editingEmployee).not.toBeNull();
      component.cancelEditEmployee();
      expect(component.editingEmployee).toBeNull();
      expect(component.employeeForm.value.name).toBeNull();
    });

    it('should delete employee and update employees list', () => {
      component.employees = [...mockEmployees];
      component.deleteEmployee(1, 'Sarah Connor Employee');

      expect(component.employees.length).toBe(1);
      expect(component.employees.find((e) => e.id === 1)).toBeUndefined();
      expect(component.employeeSuccessMessage).toContain('deleted successfully');
    });

    it('should filter employees by search term', () => {
      component.employees = [...mockEmployees];
      component.employeeSearchTerm = 'john';
      expect(component.filteredEmployees.length).toBe(1);
      expect(component.filteredEmployees[0].name).toBe('John Doe Employee');
    });
  });

  describe('Endpoint Configuration', () => {
    it('should save updated user endpoint', () => {
      component.customUserEndpoint = 'http://localhost:5000/api/users';
      component.saveUserEndpoint();
      expect(component.userService.getApiUrl()).toBe('http://localhost:5000/api/users');
      expect(component.isEditingUserEndpoint).toBe(false);
    });

    it('should save updated employee endpoint', () => {
      component.customEmployeeEndpoint = 'http://localhost:5050/api/users';
      component.saveEmployeeEndpoint();
      expect(component.employeeService.getApiUrl()).toBe('http://localhost:5050/api/users');
      expect(component.isEditingEmployeeEndpoint).toBe(false);
    });
  });
});
