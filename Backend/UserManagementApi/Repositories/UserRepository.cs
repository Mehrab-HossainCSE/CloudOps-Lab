using System.Collections.Concurrent;
using Dapper;
using Npgsql;
using UserManagementApi.Data;
using UserManagementApi.Models;

namespace UserManagementApi.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly ILogger<UserRepository> _logger;

    private static readonly ConcurrentDictionary<int, User> _fallbackStore =
        new(new[]
        {
            new KeyValuePair<int, User>(1, new User
            {
                Id = 1,
                Name = "Sarah Connor Users",
                Email = "sarah.connor@example.com"
            }),
            new KeyValuePair<int, User>(2, new User
            {
                Id = 2,
                Name = "John Doe Users",
                Email = "john.doe@example.com"
            }),
            new KeyValuePair<int, User>(3, new User
            {
                Id = 3,
                Name = "Jane Smith Users",
                Email = "jane.smith@example.com"
            })
        });

    private static int _nextFallbackId = 4;
    private static readonly object _idLock = new();

    private const string CreateTableSql = """
        CREATE TABLE IF NOT EXISTS Users
        (
            Id SERIAL PRIMARY KEY,
            Name VARCHAR(150) NOT NULL,
            Email VARCHAR(255) NOT NULL
        );
        """;

    public UserRepository(
        IDbConnectionFactory connectionFactory,
        ILogger<UserRepository> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    private async Task EnsureTableExistsAsync(
      System.Data.IDbConnection connection,
      CancellationToken cancellationToken)
    {
        await connection.ExecuteAsync(
            new CommandDefinition(
                CreateTableSql,
                cancellationToken: cancellationToken));
    }

    public async Task<IEnumerable<User>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection =
                await _connectionFactory.CreateConnectionAsync(cancellationToken);

            await EnsureTableExistsAsync(connection, cancellationToken);

            const string sql =
                "SELECT Id, Name, Email FROM Users ORDER BY Id ASC;";

            return await connection.QueryAsync<User>(
                new CommandDefinition(
                    sql,
                    cancellationToken: cancellationToken));
        }
        catch (Exception ex) when (IsDatabaseUnavailableException(ex))
        {
            _logger.LogWarning(
                "PostgreSQL unavailable. Using fallback store: {Message}",
                ex.Message);

            return _fallbackStore.Values.OrderBy(u => u.Id).ToList();
        }
    }

    public async Task<User?> GetByIdAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection =
                await _connectionFactory.CreateConnectionAsync(cancellationToken);

            await EnsureTableExistsAsync(connection, cancellationToken);

            const string sql =
                "SELECT Id, Name, Email FROM Users WHERE Id = @Id;";

            return await connection.QuerySingleOrDefaultAsync<User>(
                new CommandDefinition(
                    sql,
                    new { Id = id },
                    cancellationToken: cancellationToken));
        }
        catch (Exception ex) when (IsDatabaseUnavailableException(ex))
        {
            _logger.LogWarning(
                "PostgreSQL unavailable. Using fallback store for user {UserId}.",
                id);

            _fallbackStore.TryGetValue(id, out var user);
            return user;
        }
    }

    public async Task<User> CreateAsync(
        User user,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection =
                await _connectionFactory.CreateConnectionAsync(cancellationToken);

            await EnsureTableExistsAsync(connection, cancellationToken);

            const string sql = """
                INSERT INTO Users (Name, Email)
                VALUES (@Name, @Email)
                RETURNING Id, Name, Email;
                """;

            return await connection.QuerySingleAsync<User>(
                new CommandDefinition(
                    sql,
                    new { user.Name, user.Email },
                    cancellationToken: cancellationToken));
        }
        catch (Exception ex) when (IsDatabaseUnavailableException(ex))
        {
            _logger.LogWarning(
                "PostgreSQL unavailable. Using fallback store to create user.");

            int id;

            lock (_idLock)
            {
                id = _nextFallbackId++;
            }

            var newUser = new User
            {
                Id = id,
                Name = user.Name,
                Email = user.Email
            };

            _fallbackStore[id] = newUser;

            return newUser;
        }
    }

    public async Task<bool> DeleteAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection =
                await _connectionFactory.CreateConnectionAsync(cancellationToken);

            await EnsureTableExistsAsync(connection, cancellationToken);

            const string sql = "DELETE FROM Users WHERE Id = @Id;";

            int rowsAffected = await connection.ExecuteAsync(
                new CommandDefinition(
                    sql,
                    new { Id = id },
                    cancellationToken: cancellationToken));

            return rowsAffected > 0;
        }
        catch (Exception ex) when (IsDatabaseUnavailableException(ex))
        {
            _logger.LogWarning(
                "PostgreSQL unavailable. Using fallback store to delete user {UserId}.",
                id);

            return _fallbackStore.TryRemove(id, out _);
        }
    }

    private static bool IsDatabaseUnavailableException(Exception ex)
    {
        return ex is NpgsqlException ||
               ex is System.Net.Sockets.SocketException ||
               ex is TimeoutException ||
               ex.InnerException is NpgsqlException ||
               ex.InnerException is System.Net.Sockets.SocketException;
    }
}
