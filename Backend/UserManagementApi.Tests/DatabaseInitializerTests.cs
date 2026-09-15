using UserManagementApi.Data;
using Xunit;

namespace UserManagementApi.Tests;

public class DatabaseInitializerTests
{
    [Fact]
    public void CreateUsersTableSql_ContainsRequiredColumnsAndConstraints()
    {
        // Assert that the table definition matches the exact specifications
        var sql = DatabaseInitializer.CreateUsersTableSql;

        Assert.Contains("CREATE TABLE IF NOT EXISTS Users", sql);
        Assert.Contains("Id SERIAL PRIMARY KEY", sql);
        Assert.Contains("Name VARCHAR(150) NOT NULL", sql);
        Assert.Contains("Email VARCHAR(250) NOT NULL", sql);
    }
}
