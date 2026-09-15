using UserManagementApi.DTOs;

namespace UserManagementApi.Services;

public interface IUserService
{
    Task<IEnumerable<UserResponseDto>> GetAllUsersAsync(CancellationToken cancellationToken = default);
    Task<UserResponseDto?> GetUserByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<UserResponseDto> CreateUserAsync(CreateUserDto createUserDto, CancellationToken cancellationToken = default);
    Task<bool> DeleteUserAsync(int id, CancellationToken cancellationToken = default);
}
