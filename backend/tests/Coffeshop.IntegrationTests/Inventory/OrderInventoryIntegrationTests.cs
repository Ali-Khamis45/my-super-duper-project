using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace Coffeshop.IntegrationTests.Inventory;

/// <summary>
/// Sprint 5.4 — the real integration point between Ordering and Inventory, verified end-to-end
/// against real HTTP and the real Testcontainers Postgres: <c>IInventoryReservationCoordinator</c>
/// is called directly from the Order handlers, not through the outbox (see
/// docs/32_COMMERCE_EVENT_CATALOG.md's own Sprint 5.4 status note) — these tests are the
/// permanent regression coverage for what this sprint's own manual `curl` verification proved
/// live during Phase 4/Phase 5.
/// </summary>
public sealed class OrderInventoryIntegrationTests(CoffeshopApiFactory factory) : IClassFixture<CoffeshopApiFactory>
{
    private static readonly SemaphoreSlim IdentityLock = new(1, 1);
    private static (Guid Id, string Token)? _sharedStaff;

    private readonly HttpClient _client = factory.CreateClient();

    private async Task<(Guid Id, string Token)> GetStaffAsync()
    {
        await IdentityLock.WaitAsync();
        try
        {
            if (_sharedStaff is { } s)
            {
                return s;
            }

            var email = $"staff-{Guid.NewGuid():N}@example.com";
            const string password = "Valid1Pass!";
            var userId = await factory.CreateVerifiedUserAsync(email, password);
            await factory.PromoteToStaffAsync(userId);

            var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
            var token = (await loginResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString()!;

            _sharedStaff = (userId, token);
            return _sharedStaff.Value;
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

    private async Task<Guid> GetSeededProductIdAsync()
    {
        var menu = await _client.GetFromJsonAsync<JsonElement[]>("/api/v1/menu");
        return menu!.First().GetProperty("id").GetGuid();
    }

    private static object LineWithIngredient(Guid productId, string ingredientCode, int placementQuantity, int lineQuantity) => new
    {
        productId,
        selection = new
        {
            color = "cream",
            size = "medium",
            sleeve = "kraft",
            lid = "classic",
            logo = "classic",
            material = "glossy",
            ingredients = new[] { new { ingredientId = ingredientCode, quantity = placementQuantity } },
        },
        quantity = lineQuantity,
        recommendationId = (string?)null,
    };

    private async Task<int> GetAvailableQuantityAsync(string ingredientCode, string staffToken)
    {
        using var request = Authorized(HttpMethod.Get, $"/api/v1/admin/inventory?search={ingredientCode}", staffToken);
        var response = await _client.SendAsync(request);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        return result.GetProperty("items")[0].GetProperty("availableQuantity").GetInt32();
    }

    [Fact]
    public async Task CreateOrder_WithStockTrackedIngredient_ReservesStockWithoutTouchingOnHandBalance()
    {
        var (_, staffToken) = await GetStaffAsync();
        var productId = await GetSeededProductIdAsync();
        var availableBefore = await GetAvailableQuantityAsync("caramel", staffToken);

        var response = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { LineWithIngredient(productId, "caramel", 3, 1) },
            guestName = "Inventory Integration Guest",
            guestEmail = "inventory-integration@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var availableAfter = await GetAvailableQuantityAsync("caramel", staffToken);
        availableAfter.Should().Be(availableBefore - 3);
    }

    [Fact]
    public async Task GetReservations_ForARealOrder_ReturnsTheHumanReadableOrderNumberNotJustTheRawId()
    {
        // Regression test for a real bug found during this sprint's own e2e verification: the
        // Reservation Viewer rendered a raw OrderId Guid — technically correct data, but not what
        // staff actually work with. See IOrderRepository.GetOrderNumbersByIdsAsync's own doc comment.
        var (_, staffToken) = await GetStaffAsync();
        var productId = await GetSeededProductIdAsync();

        var createResponse = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { LineWithIngredient(productId, "caramel", 2, 1) },
            guestName = "Order Number Guest",
            guestEmail = "order-number-guest@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var orderId = created.GetProperty("id").GetGuid();
        var orderNumber = created.GetProperty("orderNumber").GetString();

        using var reservationsRequest = Authorized(HttpMethod.Get, $"/api/v1/admin/inventory/reservations?orderId={orderId}", staffToken);
        var reservationsResponse = await _client.SendAsync(reservationsRequest);
        var reservations = await reservationsResponse.Content.ReadFromJsonAsync<JsonElement>();

        reservations.GetProperty("items")[0].GetProperty("orderNumber").GetString().Should().Be(orderNumber);
    }

    [Fact]
    public async Task CreateOrder_RequestingMoreThanAvailable_Returns409AndCreatesNoOrder()
    {
        var (_, staffToken) = await GetStaffAsync();
        var productId = await GetSeededProductIdAsync();

        var response = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { LineWithIngredient(productId, "cinnamon", 1_000_000, 1) },
            guestName = "Insufficient Stock Guest",
            guestEmail = "insufficient-stock@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("type").GetString().Should().Contain("insufficient-stock");
    }

    [Fact]
    public async Task PayOrder_WithReservedStock_ConsumesTheReservationAndDebitsOnHandBalance()
    {
        var (_, staffToken) = await GetStaffAsync();
        var productId = await GetSeededProductIdAsync();
        var stockBefore = await GetAvailableQuantityAsync("sprinkles", staffToken);

        var createResponse = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { LineWithIngredient(productId, "sprinkles", 2, 1) },
            guestName = "Pay Consumes Guest",
            guestEmail = "pay-consumes@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });
        var orderId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        using var payRequest = Authorized(HttpMethod.Post, $"/api/v1/orders/{orderId}/pay", staffToken);
        var payResponse = await _client.SendAsync(payRequest);
        payResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var reservationsRequest = Authorized(HttpMethod.Get, $"/api/v1/admin/inventory/reservations?orderId={orderId}", staffToken);
        var reservationsResponse = await _client.SendAsync(reservationsRequest);
        var reservations = await reservationsResponse.Content.ReadFromJsonAsync<JsonElement>();
        reservations.GetProperty("items")[0].GetProperty("status").GetString().Should().Be("consumed");

        // Reservation held 2, then Pay converted it to a permanent debit — available is back to
        // "before minus the real debit" (same number as stockBefore - 2), not still short by the
        // hold on top of the debit.
        var availableAfterPay = await GetAvailableQuantityAsync("sprinkles", staffToken);
        availableAfterPay.Should().Be(stockBefore - 2);
    }

    [Fact]
    public async Task CancelOrder_WithReservedStock_ReleasesTheReservationBackToAvailable()
    {
        var (_, staffToken) = await GetStaffAsync();
        var productId = await GetSeededProductIdAsync();
        var stockBefore = await GetAvailableQuantityAsync("chocolate", staffToken);

        var createResponse = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { LineWithIngredient(productId, "chocolate", 4, 1) },
            guestName = "Cancel Releases Guest",
            guestEmail = "cancel-releases@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });
        var orderId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        (await GetAvailableQuantityAsync("chocolate", staffToken)).Should().Be(stockBefore - 4);

        using var cancelRequest = Authorized(HttpMethod.Post, $"/api/v1/orders/{orderId}/cancel", staffToken);
        cancelRequest.Content = JsonContent.Create(new { reason = "Integration test cancel" });
        var cancelResponse = await _client.SendAsync(cancelRequest);
        cancelResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var availableAfterCancel = await GetAvailableQuantityAsync("chocolate", staffToken);
        availableAfterCancel.Should().Be(stockBefore, "cancellation must release the hold back to available, on-hand stock never moved");
    }
}
