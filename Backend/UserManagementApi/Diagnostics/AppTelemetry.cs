using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace UserManagementApi.Diagnostics;

public static class AppTelemetry
{
    public const string ServiceName = "UserManagementApi";
    public const string ServiceVersion = "1.0.0";

    // Tracing ActivitySource
    public static readonly ActivitySource ActivitySource = new(ServiceName, ServiceVersion);

    // Metrics Meter
    public static readonly Meter Meter = new(ServiceName, ServiceVersion);

    // Metric counters
    public static readonly Counter<long> UserCreatedCounter = Meter.CreateCounter<long>(
        "usermanagement.users.created",
        unit: "{user}",
        description: "Total number of users created");

    public static readonly Counter<long> UserDeletedCounter = Meter.CreateCounter<long>(
        "usermanagement.users.deleted",
        unit: "{user}",
        description: "Total number of users deleted");

    public static readonly Counter<long> UserRequestsCounter = Meter.CreateCounter<long>(
        "usermanagement.requests.total",
        unit: "{request}",
        description: "Total number of requests processed by UserManagementApi");
}
