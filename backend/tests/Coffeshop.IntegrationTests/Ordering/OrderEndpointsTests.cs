using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace Coffeshop.IntegrationTests.Ordering;

/// <summary>
/// Shared, once-per-test-run identities (customer/other-customer/staff) — see
/// <see cref="OrderEndpointsTests.GetOrCreateAsync"/>'s own comment for why these are cached
/// instead of registered fresh per test. Keyed by the running <see cref="CoffeshopApiFactory"/>
/// instance so a differently-scoped fixture (if one is ever introduced) never reuses stale state.
/// </summary>
public sealed class OrderEndpointsTests(CoffeshopApiFactory factory) : IClassFixture<CoffeshopApiFactory>
{
    private static readonly SemaphoreSlim IdentityLock = new(1, 1);
    private static (Guid Id, string Token)? _sharedCustomer;
    private static (Guid Id, string Token)? _otherCustomer;
    private static (Guid Id, string Token)? _sharedStaff;

    private readonly HttpClient _client = factory.CreateClient();

    private static object ValidLine(Guid productId, object? ingredients = null) => new
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
            ingredients = ingredients ?? Array.Empty<object>(),
        },
        quantity = 1,
        recommendationId = (string?)null,
    };

    private async Task<Guid> GetSeededProductIdAsync()
    {
        var menu = await _client.GetFromJsonAsync<JsonElement[]>("/api/v1/menu");
        return menu!.First().GetProperty("id").GetGuid();
    }

    /// <summary>
    /// Real distinct users (owner/non-owner/staff) are created once via
    /// <see cref="CoffeshopApiFactory.CreateVerifiedUserAsync"/> (no HTTP, no rate-limit cost)
    /// and logged in once each — the real `POST /auth/login` call this test suite actually needs
    /// to exercise, without also paying the real `AuthPolicy` rate limiter's cost for a fresh
    /// `POST /auth/register` in every one of this class's facts (which, run together, exceeded
    /// the real 10-requests/minute/IP ceiling — a genuine limiter working as designed, not a bug
    /// to route around by weakening it).
    /// </summary>
    private async Task<(Guid Id, string Token)> GetOrCreateAsync(string kind)
    {
        await IdentityLock.WaitAsync();
        try
        {
            switch (kind)
            {
                case "customer" when _sharedCustomer is { } c:
                    return c;
                case "other" when _otherCustomer is { } o:
                    return o;
                case "staff" when _sharedStaff is { } s:
                    return s;
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
            switch (kind)
            {
                case "customer":
                    _sharedCustomer = identity;
                    break;
                case "other":
                    _otherCustomer = identity;
                    break;
                case "staff":
                    _sharedStaff = identity;
                    break;
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
    public async Task CreateOrder_GuestCheckout_RecalculatesPriceFromCatalogNeverTrustsClient()
    {
        // The client never sends a price at all (CreateOrderRequest has no such field) — this
        // locks in that the server independently derives it from the seeded product's own price.
        var productId = await GetSeededProductIdAsync();
        var menuItem = (await _client.GetFromJsonAsync<JsonElement[]>("/api/v1/menu"))!.First(p => p.GetProperty("id").GetGuid() == productId);
        var expectedPrice = menuItem.GetProperty("price").GetDecimal();

        var response = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { ValidLine(productId) },
            guestName = "Ada Lovelace",
            guestEmail = "ada@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var order = await response.Content.ReadFromJsonAsync<JsonElement>();
        order.GetProperty("status").GetString().Should().Be("submitted");
        order.GetProperty("items")[0].GetProperty("unitPrice").GetDecimal().Should().Be(expectedPrice);
        order.GetProperty("customerId").ValueKind.Should().Be(JsonValueKind.Null);
        order.GetProperty("guestName").GetString().Should().Be("Ada Lovelace");
    }

    [Fact]
    public async Task CreateOrder_TimelineEntries_AreInChronologicalAppendOrderNotTimestampOrder()
    {
        // Regression test for a real bug found during Phase 4 live verification: Create() and
        // Submit() stamp the exact same `now`, so a naive OrderBy(OccurredAtUtc) can return
        // "submitted" before "draft" once round-tripped through the database. OrderTimelineEntry
        // now carries an explicit Sequence ordinal instead.
        var productId = await GetSeededProductIdAsync();

        var response = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { ValidLine(productId) },
            guestName = "Grace Hopper",
            guestEmail = "grace@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        var order = await response.Content.ReadFromJsonAsync<JsonElement>();
        var statuses = order.GetProperty("timeline").EnumerateArray().Select(t => t.GetProperty("status").GetString()).ToList();
        statuses.Should().Equal("draft", "submitted");
    }

    [Fact]
    public async Task CreateOrder_NoLines_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = Array.Empty<object>(),
            guestName = "x",
            guestEmail = "x@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateOrder_UnknownProduct_Returns404()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { ValidLine(Guid.NewGuid()) },
            guestName = "x",
            guestEmail = "x@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateOrder_AuthenticatedCustomer_DerivesCustomerIdFromJwtIgnoresGuestFields()
    {
        var (customerId, token) = await GetOrCreateAsync("customer");
        var productId = await GetSeededProductIdAsync();

        using var request = Authorized(HttpMethod.Post, "/api/v1/orders", token);
        request.Content = JsonContent.Create(new
        {
            lines = new[] { ValidLine(productId) },
            guestName = (string?)null,
            guestEmail = (string?)null,
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var order = await response.Content.ReadFromJsonAsync<JsonElement>();
        order.GetProperty("customerId").GetGuid().Should().Be(customerId);
    }

    [Fact]
    public async Task GetOrder_NonOwnerCustomer_Returns404NeverConfirmsExistenceViaA403()
    {
        var (_, ownerToken) = await GetOrCreateAsync("customer");
        var (_, otherToken) = await GetOrCreateAsync("other");
        var productId = await GetSeededProductIdAsync();

        using var createRequest = Authorized(HttpMethod.Post, "/api/v1/orders", ownerToken);
        createRequest.Content = JsonContent.Create(new { lines = new[] { ValidLine(productId) }, guestName = (string?)null, guestEmail = (string?)null, fulfillmentMethod = "Pickup", idempotencyKey = Guid.NewGuid().ToString() });
        var createResponse = await _client.SendAsync(createRequest);
        var orderId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        using var getRequest = Authorized(HttpMethod.Get, $"/api/v1/orders/{orderId}", otherToken);
        var getResponse = await _client.SendAsync(getRequest);

        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PayOrder_CustomerRole_Returns403()
    {
        var (_, token) = await GetOrCreateAsync("customer");
        var productId = await GetSeededProductIdAsync();

        using var createRequest = Authorized(HttpMethod.Post, "/api/v1/orders", token);
        createRequest.Content = JsonContent.Create(new { lines = new[] { ValidLine(productId) }, guestName = (string?)null, guestEmail = (string?)null, fulfillmentMethod = "Pickup", idempotencyKey = Guid.NewGuid().ToString() });
        var createResponse = await _client.SendAsync(createRequest);
        var orderId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        using var payRequest = Authorized(HttpMethod.Post, $"/api/v1/orders/{orderId}/pay", token);
        var payResponse = await _client.SendAsync(payRequest);

        payResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task FullLifecycle_SubmitPayCompleteAsStaff_TransitionsCorrectly()
    {
        var (_, customerToken) = await GetOrCreateAsync("customer");
        var (_, staffToken) = await GetOrCreateAsync("staff");
        var productId = await GetSeededProductIdAsync();

        using var createRequest = Authorized(HttpMethod.Post, "/api/v1/orders", customerToken);
        createRequest.Content = JsonContent.Create(new { lines = new[] { ValidLine(productId) }, guestName = (string?)null, guestEmail = (string?)null, fulfillmentMethod = "Pickup", idempotencyKey = Guid.NewGuid().ToString() });
        var createResponse = await _client.SendAsync(createRequest);
        var orderId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        using var payRequest = Authorized(HttpMethod.Post, $"/api/v1/orders/{orderId}/pay", staffToken);
        var payResponse = await _client.SendAsync(payRequest);
        payResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        (await payResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString().Should().Be("paid");

        using var completeRequest = Authorized(HttpMethod.Post, $"/api/v1/orders/{orderId}/complete", staffToken);
        var completeResponse = await _client.SendAsync(completeRequest);
        completeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var completed = await completeResponse.Content.ReadFromJsonAsync<JsonElement>();
        completed.GetProperty("status").GetString().Should().Be("completed");
        completed.GetProperty("timeline").EnumerateArray().Select(t => t.GetProperty("status").GetString())
            .Should().Equal("draft", "submitted", "paid", "completed");

        using var getMyOrdersRequest = Authorized(HttpMethod.Get, "/api/v1/orders/me", customerToken);
        var myOrders = await (await _client.SendAsync(getMyOrdersRequest)).Content.ReadFromJsonAsync<JsonElement>();
        myOrders.GetProperty("items").EnumerateArray().Should().Contain(o => o.GetProperty("id").GetGuid() == orderId);
    }

    [Fact]
    public async Task CreateOrder_SameIdempotencyKeyTwice_ReturnsTheSameOrderNeverCreatesASecondOne()
    {
        // Phase 10 regression test — a real bug this sprint's own adversarial review caught live:
        // two POST /api/v1/orders requests with an identical body and no idempotency protection
        // created two separate real orders (confirmed via a real concurrent curl repro). Same
        // key, sequential this time (the concurrent race is a narrower, documented residual gap
        // — see CreateOrderFromCartCommandHandler's own comment) — this proves the actual,
        // common threat model (a retry or double-click a moment apart) is fully closed.
        var productId = await GetSeededProductIdAsync();
        var idempotencyKey = Guid.NewGuid().ToString();

        var firstResponse = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { ValidLine(productId) },
            guestName = "Idempotency Test",
            guestEmail = "idempotency@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey,
        });
        firstResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var firstOrder = await firstResponse.Content.ReadFromJsonAsync<JsonElement>();

        var secondResponse = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { ValidLine(productId) },
            guestName = "Idempotency Test",
            guestEmail = "idempotency@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey,
        });
        secondResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var secondOrder = await secondResponse.Content.ReadFromJsonAsync<JsonElement>();

        secondOrder.GetProperty("id").GetGuid().Should().Be(firstOrder.GetProperty("id").GetGuid());
        secondOrder.GetProperty("orderNumber").GetString().Should().Be(firstOrder.GetProperty("orderNumber").GetString());
    }

    [Fact]
    public async Task AdminOrders_SearchByExactOrderNumber_Returns200WithMatch()
    {
        // Regression test for a real bug found during Phase 4 live verification: searching
        // admin/orders by order number 500'd — EF Core can't translate an ILIKE partial match
        // against a HasConversion-mapped column. OrderRepository.ApplyFilter now matches
        // OrderNumber by exact equality instead (which does translate), and this only proves the
        // endpoint itself no longer 500s and still finds the order it should.
        var productId = await GetSeededProductIdAsync();

        var createResponse = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { ValidLine(productId) },
            guestName = "Search Target",
            guestEmail = "search-target@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var orderNumber = created.GetProperty("orderNumber").GetString();

        var (_, staffToken) = await GetOrCreateAsync("staff");

        using var searchRequest = Authorized(HttpMethod.Get, $"/api/v1/admin/orders?search={orderNumber}", staffToken);
        var searchResponse = await _client.SendAsync(searchRequest);

        searchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var results = await searchResponse.Content.ReadFromJsonAsync<JsonElement>();
        results.GetProperty("items").EnumerateArray().Should().Contain(o => o.GetProperty("orderNumber").GetString() == orderNumber);
    }

    [Fact]
    public async Task AdminOrders_SearchByGuestName_Returns200WithMatch()
    {
        var uniqueName = $"Unique Guest {Guid.NewGuid():N}";
        var productId = await GetSeededProductIdAsync();

        await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[] { ValidLine(productId) },
            guestName = uniqueName,
            guestEmail = "unique-guest@example.com",
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });

        var (_, staffToken) = await GetOrCreateAsync("staff");

        using var searchRequest = Authorized(HttpMethod.Get, $"/api/v1/admin/orders?search={Uri.EscapeDataString(uniqueName)}", staffToken);
        var searchResponse = await _client.SendAsync(searchRequest);

        searchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var results = await searchResponse.Content.ReadFromJsonAsync<JsonElement>();
        results.GetProperty("items").EnumerateArray().Should().Contain(o => o.GetProperty("guestName").GetString() == uniqueName);
    }

    [Fact]
    public async Task AdminOrders_CustomerRole_Returns403()
    {
        var (_, token) = await GetOrCreateAsync("customer");

        using var request = Authorized(HttpMethod.Get, "/api/v1/admin/orders", token);
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
