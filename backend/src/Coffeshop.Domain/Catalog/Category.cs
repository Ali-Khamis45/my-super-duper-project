using Coffeshop.Domain.Catalog.Events;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog;

/// <summary>
/// Per docs/30_COMMERCE_DDD_MODEL.md's Catalog context — a standalone aggregate root, not a
/// value inside <see cref="Product"/>. <see cref="Code"/> is the stable business key matching
/// the frontend's existing <c>DrinkCategoryId</c> union exactly (<c>"espresso"</c>,
/// <c>"cold-brew"</c>, <c>"seasonal"</c>, <c>"tea"</c>) — the wire contract for
/// <c>ProductDto.category</c>, per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md.
/// </summary>
public sealed class Category : AuditableEntity<Guid>
{
    public string Code { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public int SortOrder { get; private set; }

    private Category()
    {
    }

    public static Category Create(string code, string name, int sortOrder)
    {
        var category = new Category
        {
            Id = Guid.NewGuid(),
            Code = code.Trim().ToLowerInvariant(),
            Name = name.Trim(),
            SortOrder = sortOrder,
        };

        category.AddDomainEvent(new CategoryCreatedEvent(category.Id, category.Code, category.Name));
        return category;
    }

    public void Rename(string name, int sortOrder)
    {
        Name = name.Trim();
        SortOrder = sortOrder;
        AddDomainEvent(new CategoryUpdatedEvent(Id));
    }
}
