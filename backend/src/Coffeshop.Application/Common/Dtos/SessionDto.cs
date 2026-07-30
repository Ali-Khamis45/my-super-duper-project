namespace Coffeshop.Application.Common.Dtos;

public sealed record SessionDto(
    Guid Id,
    string? DeviceName,
    string? UserAgent,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? LastUsedAtUtc,
    DateTimeOffset ExpiresAtUtc,
    bool IsCurrent);
