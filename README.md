# Full-Stack User Management System

A production-ready User Management application built with **Angular**, **.NET 8 Web API**, **PostgreSQL**, **OpenTelemetry**, and **Docker / Docker Compose**.

---

## 🌟 Features Overview

- **Frontend (Angular)**:
  - Single-Page Application (SPA) with standalone components.
  - User operations: **Add a user**, **View all users**, **Delete a user**.
  - Client-side validation for required fields (`Name`, `Email`) with live error messages.
  - Clean, beginner-friendly UI with alert banners for success/error feedback, loading spinners, and confirmation dialogs.
- **Backend (.NET 8 Web API)**:
  - Clean Separation of Concerns:
    - **Controllers**: `UsersController` (`GET /api/users`, `POST /api/users`, `DELETE /api/users/{id}`).
    - **Services**: `IUserService` & `UserService` for business logic, mapping, and metric tracking.
    - **Repositories**: `IUserRepository` & `UserRepository` for data access via high-performance Dapper.
    - **DTOs**: `CreateUserDto` (with validation annotations) and `UserResponseDto`.
    - **Models**: `User` entity model.
    - **Data**: `IDbConnectionFactory`, `NpgsqlDbConnectionFactory`, and `DatabaseInitializer`.
  - Full dependency injection and async/await across all layers.
  - Swagger UI enabled at `/swagger`.
- **PostgreSQL (No EF Core Migrations)**:
  - Table schema definition maintained in application code:
    ```sql
    CREATE TABLE IF NOT EXISTS Users (
        Id SERIAL PRIMARY KEY,
        Name VARCHAR(150) NOT NULL,
        Email VARCHAR(250) NOT NULL
    );
    ```
  - **Safe `DatabaseInitializer` component**:
    - Executes automatically when the .NET application starts.
    - Queries PostgreSQL `information_schema.tables` to verify table existence.
    - Creates table only if it does not already exist; does nothing if it exists.
    - Never drops or alters existing tables.
    - The `POST /api/users` endpoint only inserts users and never performs DDL operations.
- **OpenTelemetry & Observability**:
  - **Structured Logging**: Logs HTTP method, endpoint, request duration, operation name, success/failure status, and exception details via `RequestLoggingMiddleware`.
  - **HTTP Request Telemetry**: Captures incoming and outgoing HTTP request activities.
  - **Distributed Traces**: Traces requests across ASP.NET Core controllers, custom service activities, and PostgreSQL queries using `Npgsql.OpenTelemetry`.
  - **Custom Metrics**: Tracks `usermanagement.users.created`, `usermanagement.users.deleted`, and `usermanagement.requests.total`.
  - **Exporters**: Console exporter for immediate terminal/Docker log visibility and OTLP exporter streaming to **Jaeger** (`http://localhost:16686`).
- **Containerization**:
  - Multi-stage Dockerfiles for both Backend and Frontend.
  - `docker-compose.yml` orchestrating PostgreSQL, Jaeger, .NET 8 Backend, and Angular Frontend (via Nginx).

---

## 🏗 Project Structure

```
MonitoringWithCICD/
├── Backend/
│   ├── UserManagementApi/
│   │   ├── Controllers/
│   │   │   └── UsersController.cs       # REST API endpoints
│   │   ├── Services/
│   │   │   ├── IUserService.cs
│   │   │   └── UserService.cs           # Business logic & OpenTelemetry activities
│   │   ├── Repositories/
│   │   │   ├── IUserRepository.cs
│   │   │   └── UserRepository.cs        # Dapper SQL queries
│   │   ├── DTOs/
│   │   │   ├── CreateUserDto.cs         # Input DTO with validation attributes
│   │   │   └── UserResponseDto.cs       # Response DTO
│   │   ├── Models/
│   │   │   └── User.cs                  # User entity model
│   │   ├── Data/
│   │   │   ├── IDbConnectionFactory.cs
│   │   │   ├── NpgsqlDbConnectionFactory.cs
│   │   │   └── DatabaseInitializer.cs   # Safe table initialization (No EF migrations)
│   │   ├── Diagnostics/
│   │   │   └── AppTelemetry.cs          # OpenTelemetry ActivitySource & Meter counters
│   │   ├── Middleware/
│   │   │   └── RequestLoggingMiddleware.cs # Structured logging middleware
│   │   ├── appsettings.json             # Configuration & connection strings
│   │   ├── Program.cs                   # OpenTelemetry setup & DI container
│   │   ├── UserManagementApi.csproj
│   │   └── Dockerfile                   # Multi-stage build for .NET 8
│   ├── UserManagementApi.Tests/         # xUnit unit tests for controllers, services, initializer
│   └── UserManagementApi.slnx
├── Frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── models/
│   │   │   │   └── user.model.ts        # TypeScript User & CreateUserRequest interfaces
│   │   │   ├── services/
│   │   │   │   └── user.service.ts      # Angular HttpClient service for REST calls
│   │   │   ├── app.ts                   # Component logic with Reactive forms
│   │   │   ├── app.html                 # Beginner-friendly UI template
│   │   │   ├── app.css                  # Modern, clean CSS styles
│   │   │   └── app.spec.ts              # Unit tests
│   │   └── main.ts
│   ├── nginx.conf                       # Reverse proxy & SPA routing configuration
│   ├── package.json
│   ├── angular.json
│   └── Dockerfile                       # Multi-stage Angular build + Nginx runtime
├── docker-compose.yml                   # Compose stack (PostgreSQL + Jaeger + Backend + Frontend)
└── README.md
```

---

## 🚀 Running with Docker Compose (Recommended)

To start the complete application stack (PostgreSQL, Jaeger, .NET 8 Backend, and Angular Frontend):

```bash
docker compose up --build
```

### Accessing the Application Services

| Service | URL | Description |
|---|---|---|
| **Frontend UI** | [http://localhost:4200](http://localhost:4200) or [http://localhost:80](http://localhost:80) | Angular Single-Page Application |
| **Backend Swagger** | [http://localhost:5000/swagger](http://localhost:5000/swagger) | Interactive OpenAPI / Swagger documentation |
| **Jaeger UI** | [http://localhost:16686](http://localhost:16686) | OpenTelemetry Distributed Traces & Spans |
| **Backend Health** | [http://localhost:5000/health](http://localhost:5000/health) | API health check endpoint |

To stop the containers:
```bash
docker compose down
```

---

## 💻 Running Locally Without Docker

### 1. PostgreSQL Database
Ensure a PostgreSQL instance is running with database `usermanagement`, or update `ConnectionStrings:DefaultConnection` in `Backend/UserManagementApi/appsettings.json`.

Default connection string:
```
Host=localhost;Port=5432;Database=usermanagement;Username=postgres;Password=postgres;Include Error Detail=true
```

### 2. Backend (.NET 8 Web API)
```bash
cd Backend/UserManagementApi
dotnet run
```
The API starts at `http://localhost:5000`. On startup, `DatabaseInitializer` will connect to PostgreSQL, verify the `Users` table, and create it if missing.

### 3. Frontend (Angular)
```bash
cd Frontend
npm install
npm start
```
The Angular development server starts at `http://localhost:4200` with hot-reload enabled.

---

## 🧪 Running Automated Tests

### Backend Tests (xUnit)
```bash
dotnet test Backend/UserManagementApi.slnx
```
Runs 13 unit tests verifying:
- `UserService` operations (Get all, Get by ID, Create with trimming, Delete).
- `UsersController` HTTP response statuses (`200 OK`, `201 Created`, `204 NoContent`, `404 NotFound`).
- `DatabaseInitializer` schema definitions and column constraints.

### Frontend Tests (Angular / Vitest)
```bash
cd Frontend
npm test -- --watch=false
```
Runs 6 component tests verifying:
- Component instantiation.
- Reactive form initial state and required-field validation.
- Loading users on component initialization.
- Adding a user and displaying success messages.
- Deleting a user and updating list state.

---

## 📊 OpenTelemetry Telemetry Details

The backend instruments telemetry using OpenTelemetry:

1. **Traces**:
   - `UserManagementApi` `ActivitySource` creating spans for `UserService.GetAllUsers`, `UserService.GetUserById`, `UserService.CreateUser`, and `UserService.DeleteUser`.
   - `Npgsql.OpenTelemetry` automatically tracing SQL query commands to PostgreSQL.
   - ASP.NET Core and HTTP client instrumentation tracing HTTP request flows.
2. **Metrics**:
   - `usermanagement.users.created`: Counter incremented whenever a user is added.
   - `usermanagement.users.deleted`: Counter incremented whenever a user is removed.
   - `usermanagement.requests.total`: Counter recording HTTP requests tagged with method and endpoint.
   - ASP.NET Core and .NET runtime performance metrics (CPU, GC, memory).
3. **Structured Logs**:
   - Every request is logged by `RequestLoggingMiddleware` with:
     ```
     HTTP Request Completed: Method=POST | Endpoint=/api/users | StatusCode=201 | Duration=12ms | Operation=POST /api/users | Success=True
     ```
   - Errors and exceptions are logged with full stack traces, method, and endpoint context.
