using Microsoft.Extensions.Logging;
using Moq;
using UserManagementApi.DTOs;
using UserManagementApi.Models;
using UserManagementApi.Repositories;
using UserManagementApi.Services;
using Xunit;

namespace UserManagementApi.Tests;

public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepo;
    private readonly Mock<ILogger<UserService>> _mockLogger;
    private readonly UserService _userService;

    public UserServiceTests()
    {
        _mockRepo = new Mock<IUserRepository>();
        _mockLogger = new Mock<ILogger<UserService>>();
        _userService = new UserService(_mockRepo.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task GetAllUsersAsync_ReturnsMappedUserResponseDtos()
    {
        // Arrange
        var users = new List<User>
        {
            new() { Id = 1, Name = "Alice Smith", Email = "alice@example.com" },
            new() { Id = 2, Name = "Bob Jones", Email = "bob@example.com" }
        };
        _mockRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(users);

        // Act
        var result = (await _userService.GetAllUsersAsync()).ToList();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("Alice Smith", result[0].Name);
        Assert.Equal("alice@example.com", result[0].Email);
        Assert.Equal("Bob Jones", result[1].Name);
    }

    [Fact]
    public async Task GetUserByIdAsync_WhenUserExists_ReturnsUserResponseDto()
    {
        // Arrange
        var user = new User { Id = 5, Name = "Charlie", Email = "charlie@example.com" };
        _mockRepo.Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act
        var result = await _userService.GetUserByIdAsync(5);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(5, result.Id);
        Assert.Equal("Charlie", result.Name);
        Assert.Equal("charlie@example.com", result.Email);
    }

    [Fact]
    public async Task GetUserByIdAsync_WhenUserDoesNotExist_ReturnsNull()
    {
        // Arrange
        _mockRepo.Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        // Act
        var result = await _userService.GetUserByIdAsync(999);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task CreateUserAsync_TrimsInputAndReturnsCreatedUserDto()
    {
        // Arrange
        var inputDto = new CreateUserDto { Name = "  Diana Prince  ", Email = "Diana.Prince@Example.com " };
        var createdUser = new User { Id = 10, Name = "Diana Prince", Email = "diana.prince@example.com" };

        _mockRepo.Setup(r => r.CreateAsync(It.Is<User>(u => u.Name == "Diana Prince" && u.Email == "diana.prince@example.com"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdUser);

        // Act
        var result = await _userService.CreateUserAsync(inputDto);

        // Assert
        Assert.Equal(10, result.Id);
        Assert.Equal("Diana Prince", result.Name);
        Assert.Equal("diana.prince@example.com", result.Email);
        _mockRepo.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteUserAsync_WhenExists_ReturnsTrue()
    {
        // Arrange
        _mockRepo.Setup(r => r.DeleteAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var result = await _userService.DeleteUserAsync(10);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task DeleteUserAsync_WhenDoesNotExist_ReturnsFalse()
    {
        // Arrange
        _mockRepo.Setup(r => r.DeleteAsync(999, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var result = await _userService.DeleteUserAsync(999);

        // Assert
        Assert.False(result);
    }
}
