using System.Diagnostics;
using UserManagementApi.Diagnostics;

namespace UserManagementApi.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    // Infrastructure endpoints polled on a timer (Prometheus scrapes, container probes).
    // Logging and counting them would drown out real traffic.
    private static readonly string[] UninterestingPaths = { "/metrics", "/health" };

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;
        if (UninterestingPaths.Any(p => path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        var httpMethod = context.Request.Method;
        var endpoint = context.Request.Path.Value ?? "/";
        var operationName = $"{httpMethod} {endpoint}";

        // Track custom request metric
        AppTelemetry.UserRequestsCounter.Add(1,
            new KeyValuePair<string, object?>("http.method", httpMethod),
            new KeyValuePair<string, object?>("http.endpoint", endpoint));

        try
        {
            await _next(context);
            stopwatch.Stop();

            var statusCode = context.Response.StatusCode;
            var isSuccess = statusCode >= 200 && statusCode < 400;

            if (isSuccess)
            {
                _logger.LogInformation(
                    "HTTP Request Completed: Method={HttpMethod} | Endpoint={Endpoint} | StatusCode={StatusCode} | Duration={DurationMs}ms | Operation={OperationName} | Success={Success}",
                    httpMethod,
                    endpoint,
                    statusCode,
                    stopwatch.ElapsedMilliseconds,
                    operationName,
                    true);
            }
            else
            {
                _logger.LogWarning(
                    "HTTP Request Failed: Method={HttpMethod} | Endpoint={Endpoint} | StatusCode={StatusCode} | Duration={DurationMs}ms | Operation={OperationName} | Success={Success}",
                    httpMethod,
                    endpoint,
                    statusCode,
                    stopwatch.ElapsedMilliseconds,
                    operationName,
                    false);
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                ex,
                "HTTP Request Exception: Method={HttpMethod} | Endpoint={Endpoint} | Duration={DurationMs}ms | Operation={OperationName} | Success={Success} | Exception={ExceptionType} | ErrorMessage={ExceptionMessage}",
                httpMethod,
                endpoint,
                stopwatch.ElapsedMilliseconds,
                operationName,
                false,
                ex.GetType().Name,
                ex.Message);

            throw;
        }
    }
}
