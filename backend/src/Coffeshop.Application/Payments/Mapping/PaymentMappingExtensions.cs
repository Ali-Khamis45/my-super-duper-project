using Coffeshop.Application.Payments.Dtos;
using Coffeshop.Domain.Payments;

namespace Coffeshop.Application.Payments.Mapping;

/// <summary>Hand-written mapping, matching every other bounded context's own "never a reflection-based mapper" discipline.</summary>
public static class PaymentMappingExtensions
{
    public static PaymentAttemptDto ToDto(this PaymentAttempt attempt) =>
        new(
            attempt.Id,
            attempt.Status.ToApiString(),
            attempt.ProviderReference?.Value,
            attempt.Method?.ToString(),
            attempt.Failure?.Code,
            attempt.Failure?.Message,
            attempt.Failure?.DeclineCode,
            attempt.StartedAtUtc,
            attempt.ResolvedAtUtc);

    public static PaymentDto ToDto(this Payment payment, string? orderNumber) =>
        new(
            payment.Id,
            payment.OrderId,
            orderNumber,
            payment.Amount.Amount,
            payment.Amount.Currency,
            payment.Status.ToApiString(),
            payment.Provider.ToString().ToLowerInvariant(),
            payment.RefundedAmount.Amount,
            [.. payment.Attempts.Select(a => a.ToDto())],
            payment.CreatedAtUtc);

    public static PaymentSummaryDto ToSummaryDto(this Payment payment, string? orderNumber) =>
        new(
            payment.Id,
            payment.OrderId,
            orderNumber,
            payment.Amount.Amount,
            payment.Status.ToApiString(),
            payment.Provider.ToString().ToLowerInvariant(),
            payment.CreatedAtUtc);

    /// <summary>
    /// <see cref="PaymentStatus"/>'s multi-word members (<see cref="PaymentStatus.PartiallyRefunded"/>)
    /// would collapse to unreadable <c>"partiallyrefunded"</c> under a plain
    /// <c>ToString().ToLowerInvariant()</c> — the exact same real gap this sprint's own Sprint 5.4
    /// precedent (<c>InventoryMappingExtensions.ToApiString</c>) already found and fixed for
    /// <c>InventoryStatus</c>. Fixed here before it was ever live-discovered the hard way twice.
    /// </summary>
    private static string ToApiString(this PaymentStatus status) => status switch
    {
        PaymentStatus.PartiallyRefunded => "partially-refunded",
        _ => status.ToString().ToLowerInvariant(),
    };

    /// <summary>See <see cref="ToApiString(PaymentStatus)"/>'s own doc comment — <see cref="PaymentAttemptStatus"/> has the identical multi-word gap (<see cref="PaymentAttemptStatus.TimedOut"/>).</summary>
    private static string ToApiString(this PaymentAttemptStatus status) => status switch
    {
        PaymentAttemptStatus.TimedOut => "timed-out",
        _ => status.ToString().ToLowerInvariant(),
    };
}
