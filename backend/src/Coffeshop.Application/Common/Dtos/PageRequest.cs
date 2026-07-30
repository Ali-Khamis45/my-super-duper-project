namespace Coffeshop.Application.Common.Dtos;

/// <summary>Per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md — 1-indexed, `pageSize` capped server-side at 100.</summary>
public sealed record PageRequest(int Page = 1, int PageSize = 20)
{
    public const int MaxPageSize = 100;

    public int SkipCount => (Math.Max(1, Page) - 1) * ClampedPageSize;

    public int ClampedPageSize => Math.Clamp(PageSize, 1, MaxPageSize);
}
