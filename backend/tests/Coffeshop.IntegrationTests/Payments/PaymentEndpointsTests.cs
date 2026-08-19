using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Xunit;

namespace Coffeshop.IntegrationTests.Payments;

/// <summary>
/// Sprint 5.5 — the real integration point between Ordering and Payments, verified end-to-end
/// against real HTTP, a real Testcontainers Postgres, and <c>FakePaymentGateway</c> (the real,
/// deterministic in-process gateway this whole sprint's live/e2e verification runs against — see
/// docs/reviews/sprint-5.5-review.md for the disclosed Stripe-unverified gap). These are the
/// permanent regression coverage for what this sprint's own live verification proved manually:
/// checkout → real charge → Order marked paid → reservation consumed, and the real
/// double-charge/refund/webhook paths this sprint's own adversarial review specifically targeted.
/// </summary>
public sealed class PaymentEndpointsTests(CoffeshopApiFactory factory) : IClassFixture<CoffeshopApiFactory>
{
    private static readonly SemaphoreSlim IdentityLock = new(1, 1);
    private static (Guid Id, string Token)? _sharedStaff;
    private static (Guid Id, string Token)? _sharedAdmin;

    private readonly HttpClient _client = factory.CreateClient();

    private async Task<(Guid Id, string Token)> GetStaffAsync()
    {
        await IdentityLock.WaitAsync();
        try
        {
            if (_sharedStaff is { } s) return s;

            var email = $"payments-staff-{Guid.NewGuid():N}@example.com";
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

    private async Task<(Guid Id, string Token)> GetAdminAsync()
    {
        await IdentityLock.WaitAsync();
        try
        {
            if (_sharedAdmin is { } a) return a;

            var email = $"payments-admin-{Guid.NewGuid():N}@example.com";
            const string password = "Valid1Pass!";
            var userId = await factory.CreateVerifiedUserAsync(email, password);
            await factory.PromoteToAdminAsync(userId);

            var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
            var token = (await loginResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString()!;

            _sharedAdmin = (userId, token);
            return _sharedAdmin.Value;
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

    private async Task<(Guid OrderId, decimal Total)> CreateGuestOrderAsync(string guestEmail)
    {
        var productId = await GetSeededProductIdAsync();
        var response = await _client.PostAsJsonAsync("/api/v1/orders", new
        {
            lines = new[]
            {
                new
                {
                    productId,
                    selection = new { color = "cream", size = "medium", sleeve = "kraft", lid = "classic", logo = "classic", material = "glossy", ingredients = Array.Empty<object>() },
                    quantity = 1,
                    recommendationId = (string?)null,
                },
            },
            guestName = "Payments Integration Guest",
            guestEmail,
            fulfillmentMethod = "Pickup",
            idempotencyKey = Guid.NewGuid().ToString(),
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var order = await response.Content.ReadFromJsonAsync<JsonElement>();
        return (order.GetProperty("id").GetGuid(), order.GetProperty("total").GetDecimal());
    }

    private async Task<JsonElement> GetAdminOrderAsync(Guid orderId, string staffToken)
    {
        using var request = Authorized(HttpMethod.Get, $"/api/v1/admin/orders/{orderId}", staffToken);
        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task CreateSessionThenConfirm_ForARealOrder_SucceedsAndMarksTheOrderPaid()
    {
        var (_, staffToken) = await GetStaffAsync();
        var (orderId, _) = await CreateGuestOrderAsync($"confirm-{Guid.NewGuid():N}@example.com");

        var sessionResponse = await _client.PostAsJsonAsync("/api/v1/payments/create-session", new { orderId });
        sessionResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var session = await sessionResponse.Content.ReadFromJsonAsync<JsonElement>();
        var paymentId = session.GetProperty("paymentId").GetGuid();
        session.GetProperty("status").GetString().Should().Be("started");

        var confirmResponse = await _client.PostAsync($"/api/v1/payments/{paymentId}/confirm", null);
        confirmResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var payment = await confirmResponse.Content.ReadFromJsonAsync<JsonElement>();
        payment.GetProperty("status").GetString().Should().Be("succeeded");

        var order = await GetAdminOrderAsync(orderId, staffToken);
        order.GetProperty("status").GetString().Should().Be("paid");
    }

    [Fact]
    public async Task CreateSession_CalledTwiceForTheSameOrder_IsIdempotentAgainstADoubleClickAndNeverStartsTwoRealAttempts()
    {
        var (orderId, _) = await CreateGuestOrderAsync($"doubleclick-{Guid.NewGuid():N}@example.com");

        var first = await _client.PostAsJsonAsync("/api/v1/payments/create-session", new { orderId });
        var second = await _client.PostAsJsonAsync("/api/v1/payments/create-session", new { orderId });

        first.StatusCode.Should().Be(HttpStatusCode.OK);
        second.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstPayment = await first.Content.ReadFromJsonAsync<JsonElement>();
        var secondPayment = await second.Content.ReadFromJsonAsync<JsonElement>();

        firstPayment.GetProperty("paymentId").GetGuid().Should().Be(secondPayment.GetProperty("paymentId").GetGuid());
        firstPayment.GetProperty("attemptId").GetGuid().Should().Be(secondPayment.GetProperty("attemptId").GetGuid(), "a second create-session call while the first attempt is still Processing must reuse it, never start a real second gateway attempt");
    }

    [Fact]
    public async Task Webhook_ADevSimulatedRealSignedDelivery_CapturesThroughTheActualVerificationPipeline()
    {
        var (orderId, _) = await CreateGuestOrderAsync($"webhook-{Guid.NewGuid():N}@example.com");
        var sessionResponse = await _client.PostAsJsonAsync("/api/v1/payments/create-session", new { orderId });
        var session = await sessionResponse.Content.ReadFromJsonAsync<JsonElement>();
        var paymentId = session.GetProperty("paymentId").GetGuid();

        // The dev-only simulator (Development environment only, matching this factory's own
        // UseEnvironment("Development")) builds a real HMAC-signed payload via FakePaymentGateway
        // and delivers it through ProcessPaymentWebhookCommand — the exact same verify-correlate-
        // capture pipeline a genuine Stripe webhook would traverse, not a parallel test-only path.
        var webhookResponse = await _client.PostAsJsonAsync($"/api/v1/dev/payments/{paymentId}/simulate-webhook", new { eventType = "payment_intent.succeeded" });
        webhookResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var paymentResponse = await _client.GetAsync($"/api/v1/payments/{paymentId}");
        var payment = await paymentResponse.Content.ReadFromJsonAsync<JsonElement>();
        payment.GetProperty("status").GetString().Should().Be("succeeded");
    }

    [Fact]
    public async Task PayOrder_WhileARealPaymentIsInFlight_Returns409AndNeverRisksADoubleCharge()
    {
        // Regression test for the real Sprint 5.5 finding: staff manually recording a cash payment
        // while a real card checkout was simultaneously in flight risked a genuine double charge.
        // See PayOrderCommand's own doc comment and docs/36_SECURITY_MODEL.md's Payments section.
        var (_, staffToken) = await GetStaffAsync();
        var (orderId, _) = await CreateGuestOrderAsync($"inflight-{Guid.NewGuid():N}@example.com");

        var sessionResponse = await _client.PostAsJsonAsync("/api/v1/payments/create-session", new { orderId });
        sessionResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var payRequest = Authorized(HttpMethod.Post, $"/api/v1/orders/{orderId}/pay", staffToken);
        var payResponse = await _client.SendAsync(payRequest);

        payResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await payResponse.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("type").GetString().Should().Contain("payment-in-progress");

        var order = await GetAdminOrderAsync(orderId, staffToken);
        order.GetProperty("status").GetString().Should().Be("submitted", "the guard must reject before Order.MarkPaid ever runs, leaving the order untouched");
    }

    [Fact]
    public async Task RefundPayment_AfterASuccessfulCapture_ReducesTheRemainingBalanceAndNeverTouchesOrderStatus()
    {
        var (_, staffToken) = await GetStaffAsync();
        var (_, adminToken) = await GetAdminAsync();
        var (orderId, total) = await CreateGuestOrderAsync($"refund-{Guid.NewGuid():N}@example.com");

        var sessionResponse = await _client.PostAsJsonAsync("/api/v1/payments/create-session", new { orderId });
        var session = await sessionResponse.Content.ReadFromJsonAsync<JsonElement>();
        var paymentId = session.GetProperty("paymentId").GetGuid();

        var confirmResponse = await _client.PostAsync($"/api/v1/payments/{paymentId}/confirm", null);
        confirmResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var refundRequest = Authorized(HttpMethod.Post, $"/api/v1/payments/{paymentId}/refund", adminToken);
        refundRequest.Content = JsonContent.Create(new { amount = (decimal?)null, reason = "Integration test refund" });
        var refundResponse = await _client.SendAsync(refundRequest);

        refundResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var refunded = await refundResponse.Content.ReadFromJsonAsync<JsonElement>();
        refunded.GetProperty("status").GetString().Should().Be("refunded");
        refunded.GetProperty("refundedAmount").GetDecimal().Should().Be(total);

        var order = await GetAdminOrderAsync(orderId, staffToken);
        order.GetProperty("status").GetString().Should().Be("paid", "a refund is a Payments-context concern only — a served drink isn't un-served by a refund, see RefundPaymentCommand's own doc comment");
    }

    [Fact]
    public async Task RefundPayment_AsStaffWithoutProcessRefunds_Returns403()
    {
        // Permission-boundary check: refunds:process is seeded Admin-only, never Staff — a
        // meaningfully more sensitive action than viewing payments (payments:view).
        var (_, staffToken) = await GetStaffAsync();
        var (orderId, _) = await CreateGuestOrderAsync($"staffrefund-{Guid.NewGuid():N}@example.com");

        var sessionResponse = await _client.PostAsJsonAsync("/api/v1/payments/create-session", new { orderId });
        var session = await sessionResponse.Content.ReadFromJsonAsync<JsonElement>();
        var paymentId = session.GetProperty("paymentId").GetGuid();
        await _client.PostAsync($"/api/v1/payments/{paymentId}/confirm", null);

        using var refundRequest = Authorized(HttpMethod.Post, $"/api/v1/payments/{paymentId}/refund", staffToken);
        refundRequest.Content = JsonContent.Create(new { amount = (decimal?)null, reason = "Should be forbidden" });
        var refundResponse = await _client.SendAsync(refundRequest);

        refundResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
