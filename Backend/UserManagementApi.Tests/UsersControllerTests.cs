using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using UserManagementApi.Controllers;
using UserManagementApi.DTOs;
using UserManagementApi.Services;
using Xunit;

namespace UserManagementApi.Tests;

public class UsersControllerTests
{
    private readonly Mock<IUserService> _mockUserService;
    private readonly Mock<ILogger<UsersController>> _mockLogger;
    private readonly UsersController _controller;

    public UsersControllerTests()
    {
        _mockUserService = new Mock<IUserService>();
        _mockLogger = new Mock<ILogger<UsersController>>();
        _controller = new UsersController(_mockUserService.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsOkWithUsers()
    {
        // Arrange
        var users = new List<UserResponseDto>
        {
            new() { Id = 1, Name = "User 1", Email = "u1@example.com" }
        };
        _mockUserService.Setup(s => s.GetAllUsersAsync(It.IsAny<CancellationToken>())).ReturnsAsync(users);

        // Act
        var result = await _controller.GetAll(CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedUsers = Assert.IsAssignableFrom<IEnumerable<UserResponseDto>>(okResult.Value);
        Assert.Single(returnedUsers);
    }

    [Fact]
    public async Task GetById_WhenFound_ReturnsOk()
    {
        // Arrange
        var user = new UserResponseDto { Id = 1, Name = "User 1", Email = "u1@example.com" };
        _mockUserService.Setup(s => s.GetUserByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        // Act
        var result = await _controller.GetById(1, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedUser = Assert.IsType<UserResponseDto>(okResult.Value);
        Assert.Equal(1, returnedUser.Id);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockUserService.Setup(s => s.GetUserByIdAsync(999, It.IsAny<CancellationToken>())).ReturnsAsync((UserResponseDto?)null);

        // Act
        var result = await _controller.GetById(999, CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ValidUser_ReturnsCreatedAtAction()
    {
        // Arrange
        var dto = new CreateUserDto { Name = "John Doe", Email = "john@example.com" };
        var createdDto = new UserResponseDto { Id = 42, Name = "John Doe", Email = "john@example.com" };
        _mockUserService.Setup(s => s.CreateUserAsync(dto, It.IsAny<CancellationToken>())).ReturnsAsync(createdDto);

        // Act
        var result = await _controller.Create(dto, CancellationToken.None);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(_controller.GetById), createdResult.ActionName);
        var returnedDto = Assert.IsType<UserResponseDto>(createdResult.Value);
        Assert.Equal(42, returnedDto.Id);
    }

    [Fact]
    public async Task Delete_WhenSuccessful_ReturnsNoContent()
    {
        // Arrange
        _mockUserService.Setup(s => s.DeleteUserAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var result = await _controller.Delete(1, CancellationToken.None);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockUserService.Setup(s => s.DeleteUserAsync(99, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        // Act
        var result = await _controller.Delete(99, CancellationToken.None);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }
}
