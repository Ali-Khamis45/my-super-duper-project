using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Coffeshop.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Coffeshop.IntegrationTests.Catalog;

public sealed class CatalogEndpointsTests(CoffeshopApiFactory factory) : IClassFixture<CoffeshopApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetMenu_ReturnsOnlyPublishedAvailableSeededProducts()
    {
        var response = await _client.GetAsync("/api/v1/menu");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var menu = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        menu.Should().NotBeNull();
        menu!.Length.Should().Be(14, "the seeder loads exactly the 14 drinks traced from features/menu/data/drinks.ts");
        menu.Should().OnlyContain(p => p.GetProperty("status").GetString() == "published");
    }

    [Fact]
    public async Task GetCategories_ReturnsTheFourSeededCategories()
    {
        var response = await _client.GetAsync("/api/v1/categories");

        var categories = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        categories!.Select(c => c.GetProperty("code").GetString()).Should().BeEquivalentTo(["espresso", "cold-brew", "seasonal", "tea"]);
    }

    [Fact]
    public async Task GetIngredients_ReturnsTheNineSeededIngredients()
    {
        var response = await _client.GetAsync("/api/v1/ingredients");

        var ingredients = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        ingredients!.Length.Should().Be(9);
    }

    [Fact]
    public async Task Search_RanksNameMatchAboveDescriptionOnlyMatch()
    {
        var response = await _client.GetAsync("/api/v1/search?q=latte");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = result.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("name").GetString()).ToList();

        items.Should().Contain("Chai Latte");
        // "Flat White" only mentions "latte" in its description (weight C), so a real name match
        // ("...Latte", weight A) must rank strictly above it — the same live-data finding from
        // this sprint's manual `psql` ts_rank verification, now locked in as a regression test.
        var flatWhiteIndex = items.IndexOf("Flat White");
        var chaiIndex = items.IndexOf("Chai Latte");
        (flatWhiteIndex == -1 || chaiIndex < flatWhiteIndex).Should().BeTrue();
    }

    [Fact]
    public async Task Autocomplete_MatchesNamePrefix()
    {
        var response = await _client.GetAsync("/api/v1/search/autocomplete?q=Ice");

        var suggestions = await response.Content.ReadFromJsonAsync<string[]>();
        suggestions.Should().Contain("Iced Vanilla Latte");
    }

    [Fact]
    public async Task CreateProduct_NoAuth_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/products", new
        {
            sku = "NOAUTH-1",
            name = "x",
            categoryCode = "espresso",
            price = 1m,
            tagline = "x",
            description = "x",
            tags = Array.Empty<string>(),
            season = "AllYear",
            temperature = "Hot",
            type = "Beverage",
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateProduct_CustomerRole_Returns403()
    {
        var email = $"customer-{Guid.NewGuid():N}@example.com";
        await RegisterAndVerifyAsync(email);
        var token = await LoginAsync(email);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/products");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new
        {
            sku = "CUST-1",
            name = "x",
            categoryCode = "espresso",
            price = 1m,
            tagline = "x",
            description = "x",
            tags = Array.Empty<string>(),
            season = "AllYear",
            temperature = "Hot",
            type = "Beverage",
        });

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task FullLifecycle_CreateAsAdmin_DraftHiddenFromMenu_PublishMakesItVisible_ArchiveBlocksEdits()
    {
        var email = $"admin-{Guid.NewGuid():N}@example.com";
        var userId = await RegisterAndVerifyAsync(email);
        await factory.PromoteToAdminAsync(userId);
        var token = await LoginAsync(email);

        var sku = $"ITEST-{Guid.NewGuid():N}"[..20];

        using var createRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/products");
        createRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        createRequest.Content = JsonContent.Create(new
        {
            sku,
            name = "Integration Test Drink",
            categoryCode = "espresso",
            price = 4.00m,
            compareAtPrice = (decimal?)null,
            tagline = "x",
            description = "x",
            tags = Array.Empty<string>(),
            season = "AllYear",
            temperature = "Hot",
            type = "Beverage",
        });
        var createResponse = await _client.SendAsync(createRequest);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var productId = created.GetProperty("id").GetGuid();
        created.GetProperty("status").GetString().Should().Be("draft");

        // Draft must not leak into the public menu.
        var menuBefore = await _client.GetFromJsonAsync<JsonElement[]>("/api/v1/menu");
        menuBefore!.Any(p => p.GetProperty("id").GetGuid() == productId).Should().BeFalse();

        using var publishRequest = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/products/{productId}/publish");
        publishRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        (await _client.SendAsync(publishRequest)).StatusCode.Should().Be(HttpStatusCode.NoContent);

        var menuAfter = await _client.GetFromJsonAsync<JsonElement[]>("/api/v1/menu");
        menuAfter!.Any(p => p.GetProperty("id").GetGuid() == productId).Should().BeTrue();

        using var archiveRequest = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/products/{productId}/archive");
        archiveRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        (await _client.SendAsync(archiveRequest)).StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var editRequest = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/products/{productId}");
        editRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        editRequest.Content = JsonContent.Create(new { name = "Should fail", tagline = "x", description = "x", tags = Array.Empty<string>() });
        var editResponse = await _client.SendAsync(editRequest);
        editResponse.StatusCode.Should().Be(HttpStatusCode.Conflict, "an archived product must reject further edits");
    }

    private async Task<Guid> RegisterAndVerifyAsync(string email)
    {
        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", new { email, password = "Valid1Pass!", fullName = "Test User" });
        var userId = (await registerResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CoffeshopDbContext>();
        var user = await context.Users.FirstAsync(u => u.Id == userId);
        var token = user.EmailVerificationTokens.Single();
        user.VerifyEmail(token.TokenHash);
        await context.SaveChangesAsync();

        return userId;
    }

    private async Task<string> LoginAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "Valid1Pass!" });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("accessToken").GetString()!;
    }
}
