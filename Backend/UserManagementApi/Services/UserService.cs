using UserManagementApi.Diagnostics;
using UserManagementApi.DTOs;
using UserManagementApi.Models;
using UserManagementApi.Repositories;

namespace UserManagementApi.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository userRepository, ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<IEnumerable<UserResponseDto>> GetAllUsersAsync(CancellationToken cancellationToken = default)
    {
        using var activity = AppTelemetry.ActivitySource.StartActivity("UserService.GetAllUsers");
        _logger.LogInformation("Retrieving all users from database...");

        var users = await _userRepository.GetAllAsync(cancellationToken);
        var result = users.Select(u => new UserResponseDto
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email
        }).ToList();

        activity?.SetTag("users.count", result.Count);
        _logger.LogInformation("Retrieved {UserCount} users successfully.", result.Count);
        return result;
    }

    public async Task<UserResponseDto?> GetUserByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        using var activity = AppTelemetry.ActivitySource.StartActivity("UserService.GetUserById");
        activity?.SetTag("user.id", id);
        _logger.LogInformation("Retrieving user with Id: {UserId}...", id);

        var user = await _userRepository.GetByIdAsync(id, cancellationToken);
        if (user == null)
        {
            _logger.LogWarning("User with Id: {UserId} was not found.", id);
            return null;
        }

        return new UserResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email
        };
    }

    public async Task<UserResponseDto> CreateUserAsync(CreateUserDto createUserDto, CancellationToken cancellationToken = default)
    {
        using var activity = AppTelemetry.ActivitySource.StartActivity("UserService.CreateUser");
        activity?.SetTag("user.name", createUserDto.Name);
        activity?.SetTag("user.email", createUserDto.Email);
        _logger.LogInformation("Creating new user with Name: {UserName}, Email: {UserEmail}...", createUserDto.Name, createUserDto.Email);

        var user = new User
        {
            Name = createUserDto.Name.Trim(),
            Email = createUserDto.Email.Trim().ToLowerInvariant()
        };

        var created = await _userRepository.CreateAsync(user, cancellationToken);

        AppTelemetry.UserCreatedCounter.Add(1, new KeyValuePair<string, object?>("status", "success"));
        activity?.SetTag("user.id", created.Id);
        _logger.LogInformation("User created successfully with assigned Id: {UserId}.", created.Id);

        return new UserResponseDto
        {
            Id = created.Id,
            Name = created.Name,
            Email = created.Email
        };
    }

    public async Task<bool> DeleteUserAsync(int id, CancellationToken cancellationToken = default)
    {
        using var activity = AppTelemetry.ActivitySource.StartActivity("UserService.DeleteUser");
        activity?.SetTag("user.id", id);
        _logger.LogInformation("Attempting to delete user with Id: {UserId}...", id);

        bool deleted = await _userRepository.DeleteAsync(id, cancellationToken);
        if (deleted)
        {
            AppTelemetry.UserDeletedCounter.Add(1, new KeyValuePair<string, object?>("status", "success"));
            _logger.LogInformation("User with Id: {UserId} was successfully deleted.", id);
        }
        else
        {
            _logger.LogWarning("Failed to delete user: User with Id: {UserId} was not found.", id);
        }

        return deleted;
    }
}
