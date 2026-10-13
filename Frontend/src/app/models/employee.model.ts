export interface Employee {
  id: number;
  name: string;
  email: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
}

export interface UpdateEmployeeRequest {
  name: string;
  email: string;
}
