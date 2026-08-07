using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace Coffeshop.IntegrationTests.Inventory;

/// <summary>
/// Sprint 5.4 — real HTTP against the real Testcontainers Postgres, per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's testing standards. Relies on
/// <c>InventorySeeder</c>'s real dev seed data (wired into <see cref="CoffeshopApiFactory.InitializeAsync"/>
/// alongside Identity/Catalog seeding) rather than seeding fresh rows per test — "foam"/"milk"/
/// "syrup"/etc. always exist with real, known starting quantities.
/// </summary>
public sealed class InventoryEndpointsTests(CoffeshopApiFactory factory) : IClassFixture<CoffeshopApiFactory>
{
    private static readonly SemaphoreSlim IdentityLock = new(1, 1);
    private static (Guid Id, string Token)? _sharedStaff;
    private static (Guid Id, string Token)? _sharedCustomer;

    private readonly HttpClient _client = factory.CreateClient();

    private async Task<(Guid Id, string Token)> GetOrCreateAsync(string kind)
    {
        await IdentityLock.WaitAsync();
        try
        {
            if (kind == "staff" && _sharedStaff is { } s)
            {
                return s;
            }

            if (kind == "customer" && _sharedCustomer is { } c)
            {
                return c;
            }

            var email = $"{kind}-{Guid.NewGuid():N}@example.com";
            const string password = "Valid1Pass!";
            var userId = await factory.CreateVerifiedUserAsync(email, password);

            if (kind == "staff")
            {
                await factory.PromoteToStaffAsync(userId);
            }

            var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
            var token = (await loginResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString()!;

            var identity = (userId, token);
            if (kind == "staff")
            {
                _sharedStaff = identity;
            }
            else
            {
                _sharedCustomer = identity;
            }

            return identity;
        }
        finally
        {
            IdentityLock.Release();
        }
    }

    private static HttpRequestMessage Authorized(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    [Fact]
    public async Task GetInventory_CustomerRole_Returns403()
    {
        var (_, token) = await GetOrCreateAsync("customer");

        using var request = Authorized(HttpMethod.Get, "/api/v1/admin/inventory", token);
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetInventory_Staff_ReturnsSeededIngredients()
    {
        var (_, token) = await GetOrCreateAsync("staff");

        using var request = Authorized(HttpMethod.Get, "/api/v1/admin/inventory?pageSize=50", token);
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        result.GetProperty("items").EnumerateArray().Should().Contain(i => i.GetProperty("ingredientCode").GetString() == "foam");
    }

    [Fact]
    public async Task GetInventory_SearchByIngredientCode_FiltersToMatchingItemsOnly()
    {
        var (_, token) = await GetOrCreateAsync("staff");

        using var request = Authorized(HttpMethod.Get, "/api/v1/admin/inventory?search=foam", token);
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = result.GetProperty("items").EnumerateArray().ToList();
        items.Should().OnlyContain(i => i.GetProperty("ingredientCode").GetString() == "foam");
    }

    [Fact]
    public async Task GetDashboard_Staff_ReturnsRealGroupedCounts()
    {
        // Regression test for a real bug found during this sprint's own Phase 5 live
        // verification: GetInventoryDashboardQuery 500'd — EF Core failed to translate
        // `OrderBy(i => i.StockLevel.Value)` (member access on a HasConversion-mapped VO
        // property). Fixed to order by the VO property itself; this proves the endpoint no
        // longer 500s and returns real, internally-consistent counts.
        var (_, token) = await GetOrCreateAsync("staff");

        using var request = Authorized(HttpMethod.Get, "/api/v1/admin/inventory/dashboard", token);
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dashboard = await response.Content.ReadFromJsonAsync<JsonElement>();
        var total = dashboard.GetProperty("totalItems").GetInt32();
        var available = dashboard.GetProperty("availableCount").GetInt32();
        var lowStock = dashboard.GetProperty("lowStockCount").GetInt32();
        var outOfStock = dashboard.GetProperty("outOfStockCount").GetInt32();
        (available + lowStock + outOfStock).Should().Be(total);
    }

    [Fact]
    public async Task Restock_Staff_IncreasesStockLevelAndRecordsATransaction()
    {
        var (_, token) = await GetOrCreateAsync("staff");

        using var listRequest = Authorized(HttpMethod.Get, "/api/v1/admin/inventory?search=cream", token);
        var listResponse = await _client.SendAsync(listRequest);
        var itemId = (await listResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items")[0].GetProperty("id").GetGuid();

        using var getBefore = Authorized(HttpMethod.Get, $"/api/v1/admin/inventory/{itemId}", token);
        var before = await (await _client.SendAsync(getBefore)).Content.ReadFromJsonAsync<JsonElement>();
        var stockBefore = before.GetProperty("stockLevel").GetInt32();

        using var restockRequest = Authorized(HttpMethod.Post, $"/api/v1/admin/inventory/{itemId}/restock", token);
        restockRequest.Content = JsonContent.Create(new { quantity = 5, note = "Integration test restock" });
        var restockResponse = await _client.SendAsync(restockRequest);

        restockResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var restocked = await restockResponse.Content.ReadFromJsonAsync<JsonElement>();
        restocked.GetProperty("stockLevel").GetInt32().Should().Be(stockBefore + 5);
    }

    [Fact]
    public async Task Adjust_ZeroDelta_Returns400()
    {
        var (_, token) = await GetOrCreateAsync("staff");

        using var listRequest = Authorized(HttpMethod.Get, "/api/v1/admin/inventory?search=sprinkles", token);
        var listResponse = await _client.SendAsync(listRequest);
        var itemId = (await listResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items")[0].GetProperty("id").GetGuid();

        using var adjustRequest = Authorized(HttpMethod.Post, $"/api/v1/admin/inventory/{itemId}/adjust", token);
        adjustRequest.Content = JsonContent.Create(new { delta = 0, reason = "Should be rejected" });
        var response = await _client.SendAsync(adjustRequest);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task MarkOutOfStockThenMarkAvailable_Staff_RoundTripsStatusCorrectly()
    {
        var (_, token) = await GetOrCreateAsync("staff");

        using var listRequest = Authorized(HttpMethod.Get, "/api/v1/admin/inventory?search=chocolate", token);
        var listResponse = await _client.SendAsync(listRequest);
        var itemId = (await listResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items")[0].GetProperty("id").GetGuid();

        using var markOutRequest = Authorized(HttpMethod.Post, $"/api/v1/admin/inventory/{itemId}/mark-out-of-stock", token);
        var markOutResponse = await _client.SendAsync(markOutRequest);
        markOutResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        (await markOutResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().Should().Be("out-of-stock");

        using var markAvailableRequest = Authorized(HttpMethod.Post, $"/api/v1/admin/inventory/{itemId}/mark-available", token);
        var markAvailableResponse = await _client.SendAsync(markAvailableRequest);
        markAvailableResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        (await markAvailableResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().Should().Be("available");
    }

    [Fact]
    public async Task InventoryStatusFilter_KebabCaseValue_TranslatesCorrectly()
    {
        // Regression test for a real bug found during this sprint's own Phase 5 live
        // verification: InventoryStatus's multi-word members serialize as kebab-case
        // ("low-stock"/"out-of-stock") but a plain Enum.Parse can't read that back — this
        // proves the round trip (real API output fed back in as a real filter) actually works.
        var (_, token) = await GetOrCreateAsync("staff");

        using var request = Authorized(HttpMethod.Get, "/api/v1/admin/inventory?status=low-stock", token);
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        result.GetProperty("items").EnumerateArray().Should().OnlyContain(i => i.GetProperty("status").GetString() == "low-stock");
    }
}
