using Npgsql;

namespace UserManagementApi.Data;

public class DatabaseInitializer
{
    private readonly NpgsqlDataSource _dataSource;
    private readonly ILogger<DatabaseInitializer> _logger;

    // Table definition maintained in the backend codebase
    public const string CreateUsersTableSql = """
        CREATE TABLE IF NOT EXISTS Users (
            Id SERIAL PRIMARY KEY,
            Name VARCHAR(150) NOT NULL,
            Email VARCHAR(250) NOT NULL
        );
        """;

    public DatabaseInitializer(NpgsqlDataSource dataSource, ILogger<DatabaseInitializer> logger)
    {
        _dataSource = dataSource;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        const int maxRetries = 10;
        var retryDelay = TimeSpan.FromSeconds(2);

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                _logger.LogInformation("DatabaseInitializer: Checking database connection and schema status (attempt {Attempt}/{MaxRetries})...", attempt, maxRetries);

                await using var connection = await _dataSource.OpenConnectionAsync(cancellationToken);

                // Query PostgreSQL information_schema to verify whether the Users table already exists
                const string checkTableExistsSql = """
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND LOWER(table_name) = 'users'
                    );
                    """;

                await using var checkCmd = connection.CreateCommand();
                checkCmd.CommandText = checkTableExistsSql;
                var result = await checkCmd.ExecuteScalarAsync(cancellationToken);
                bool tableExists = result is bool exists && exists;

                if (tableExists)
                {
                    _logger.LogInformation("DatabaseInitializer: Table 'Users' already exists in PostgreSQL. No schema changes made.");
                }
                else
                {
                    _logger.LogInformation("DatabaseInitializer: Table 'Users' does not exist. Creating table using application schema definition...");
                    await using var createCmd = connection.CreateCommand();
                    createCmd.CommandText = CreateUsersTableSql;
                    await createCmd.ExecuteNonQueryAsync(cancellationToken);
                    _logger.LogInformation("DatabaseInitializer: Table 'Users' created successfully.");
                }

                return;
            }
            catch (Exception ex) when (attempt < maxRetries && !cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "DatabaseInitializer: Database connection attempt {Attempt}/{MaxRetries} failed. Retrying in {Delay} seconds...", attempt, maxRetries, retryDelay.TotalSeconds);
                await Task.Delay(retryDelay, cancellationToken);
            }
        }
    }
}
