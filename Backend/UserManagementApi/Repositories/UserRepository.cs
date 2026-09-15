using Dapper;
using UserManagementApi.Data;
using UserManagementApi.Models;

namespace UserManagementApi.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IDbConnectionFactory _connectionFactory;
    private readonly ILogger<UserRepository> _logger;

    public UserRepository(IDbConnectionFactory connectionFactory, ILogger<UserRepository> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<IEnumerable<User>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("UserRepository: Executing query to fetch all users.");
        using var connection = await _connectionFactory.CreateConnectionAsync(cancellationToken);
        const string sql = "SELECT Id, Name, Email FROM Users ORDER BY Id ASC;";
        return await connection.QueryAsync<User>(new CommandDefinition(sql, cancellationToken: cancellationToken));
    }

    public async Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("UserRepository: Executing query to fetch user by ID: {UserId}.", id);
        using var connection = await _connectionFactory.CreateConnectionAsync(cancellationToken);
        const string sql = "SELECT Id, Name, Email FROM Users WHERE Id = @Id;";
        return await connection.QuerySingleOrDefaultAsync<User>(new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));
    }

    public async Task<User> CreateAsync(User user, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("UserRepository: Executing insert for user '{UserName}'.", user.Name);
        using var connection = await _connectionFactory.CreateConnectionAsync(cancellationToken);
        const string sql = """
            INSERT INTO Users (Name, Email)
            VALUES (@Name, @Email)
            RETURNING Id, Name, Email;
            """;
        return await connection.QuerySingleAsync<User>(new CommandDefinition(sql, new { user.Name, user.Email }, cancellationToken: cancellationToken));
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("UserRepository: Executing delete for user ID: {UserId}.", id);
        using var connection = await _connectionFactory.CreateConnectionAsync(cancellationToken);
        const string sql = "DELETE FROM Users WHERE Id = @Id;";
        int rowsAffected = await connection.ExecuteAsync(new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));
        return rowsAffected > 0;
    }
}
