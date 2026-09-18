using Npgsql;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using UserManagementApi.Data;
using UserManagementApi.Diagnostics;
using UserManagementApi.Middleware;
using UserManagementApi.Repositories;
using UserManagementApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------
// 1. OpenTelemetry Configuration
// ---------------------------------------------------------
var otlpEndpointUri = builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] 
    ?? builder.Configuration["OpenTelemetry:OtlpEndpoint"] 
    ?? "http://localhost:4317";

var resourceBuilder = ResourceBuilder.CreateDefault()
    .AddService(serviceName: AppTelemetry.ServiceName, serviceVersion: AppTelemetry.ServiceVersion);

// Configure OpenTelemetry Tracing and Metrics
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .SetResourceBuilder(resourceBuilder)
            .AddSource(AppTelemetry.ServiceName)
            .AddAspNetCoreInstrumentation(options =>
            {
                options.RecordException = true;
            })
            .AddHttpClientInstrumentation()
            .AddNpgsql() // Distributed tracing for PostgreSQL calls
            .AddConsoleExporter();

        if (Uri.TryCreate(otlpEndpointUri, UriKind.Absolute, out var uri))
        {
            tracing.AddOtlpExporter(opt => opt.Endpoint = uri);
        }
    })
    .WithMetrics(metrics =>
    {
        metrics
            .SetResourceBuilder(resourceBuilder)
            .AddMeter(AppTelemetry.ServiceName)
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()
            .AddPrometheusExporter() // Exposes the /metrics scrape endpoint for Prometheus
            .AddConsoleExporter();

        if (Uri.TryCreate(otlpEndpointUri, UriKind.Absolute, out var uri))
        {
            metrics.AddOtlpExporter(opt => opt.Endpoint = uri);
        }
    });

// Configure OpenTelemetry Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddOpenTelemetry(logging =>
{
    logging.SetResourceBuilder(resourceBuilder);
    logging.IncludeFormattedMessage = true;
    logging.IncludeScopes = true;
    logging.ParseStateValues = true;
    logging.AddConsoleExporter();

    if (Uri.TryCreate(otlpEndpointUri, UriKind.Absolute, out var uri))
    {
        logging.AddOtlpExporter(opt => opt.Endpoint = uri);
    }
});

// ---------------------------------------------------------
// 2. Database & Application Services Configuration
// ---------------------------------------------------------
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=usermanagement;Username=postgres;Password=postgres;Include Error Detail=true";

// Register NpgsqlDataSource as singleton
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
var dataSource = dataSourceBuilder.Build();
builder.Services.AddSingleton(dataSource);

// Register Data & Repositories
builder.Services.AddSingleton<IDbConnectionFactory, NpgsqlDbConnectionFactory>();
builder.Services.AddSingleton<DatabaseInitializer>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// Register Application Services
builder.Services.AddScoped<IUserService, UserService>();

// ---------------------------------------------------------
// 3. CORS Configuration
// ---------------------------------------------------------
const string corsPolicyName = "AllowFrontend";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:4200", "http://localhost", "http://localhost:80" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicyName, policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "User Management API", Version = "v1" });
});

var app = builder.Build();

// ---------------------------------------------------------
// 4. Safe Database Initialization on Application Startup
// ---------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<DatabaseInitializer>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        logger.LogInformation("Starting database initialization check...");
        await initializer.InitializeAsync();
        logger.LogInformation("Database initialization completed successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during database initialization: {ErrorMessage}", ex.Message);
        // Do not crash the entire application immediately; allow healthchecks or retries
    }
}

// ---------------------------------------------------------
// 5. Middleware Pipeline
// ---------------------------------------------------------
if (app.Environment.IsDevelopment() || true) // Enable Swagger for easy inspection
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "User Management API v1");
        c.RoutePrefix = "swagger";
    });
}

// Custom structured request logging middleware
app.UseMiddleware<RequestLoggingMiddleware>();

app.UseCors(corsPolicyName);

app.MapControllers();

// Prometheus scrape endpoint (GET /metrics) consumed by the prometheus service
app.MapPrometheusScrapingEndpoint();

// Health check endpoint for container probes
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));

app.Run();
