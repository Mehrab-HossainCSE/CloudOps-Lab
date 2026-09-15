using System.ComponentModel.DataAnnotations;

namespace UserManagementApi.DTOs;

public class CreateUserDto
{
    [Required(ErrorMessage = "Name is required.")]
    [StringLength(150, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 150 characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "A valid email address is required.")]
    [StringLength(250, ErrorMessage = "Email cannot exceed 250 characters.")]
    public string Email { get; set; } = string.Empty;
}
