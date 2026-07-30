namespace Coffeshop.Application.Common.Dtos;

/// <summary>The frozen list-response envelope, per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's REST conventions table — every list endpoint, one shape, never a bare array.</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}
