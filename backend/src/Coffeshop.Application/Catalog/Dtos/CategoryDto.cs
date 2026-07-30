namespace Coffeshop.Application.Catalog.Dtos;

public sealed record CategoryDto(Guid Id, string Code, string Name, int SortOrder);
