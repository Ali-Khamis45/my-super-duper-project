using Coffeshop.Application.Catalog.Ingredients;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.Exceptions;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace Coffeshop.Application.Tests.Catalog;

public sealed class CreateIngredientCommandHandlerTests
{
    private readonly IIngredientRepository _ingredientRepository = Substitute.For<IIngredientRepository>();
    private readonly CreateIngredientCommandHandler _sut;

    public CreateIngredientCommandHandlerTests()
    {
        _sut = new CreateIngredientCommandHandler(_ingredientRepository);
    }

    private static CreateIngredientCommand ValidCommand(Guid categoryId) => new(
        "oat-milk", "Oat Milk", categoryId, 0.5m, [], true, "#fff", "Ring", 0);

    [Fact]
    public async Task Handle_CodeAlreadyExists_ThrowsWithoutCheckingCategory()
    {
        _ingredientRepository.ExistsByCodeAsync("oat-milk", Arg.Any<CancellationToken>()).Returns(true);

        var act = () => _sut.Handle(ValidCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<IngredientAlreadyExistsException>();
        await _ingredientRepository.DidNotReceive().GetCategoryCodesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UnknownIngredientCategoryId_ThrowsIngredientCategoryNotFoundException()
    {
        // The real gap this test locks in: previously nothing checked whether
        // `IngredientCategoryId` referred to a real row — no FluentValidation rule catches a
        // syntactically-valid-but-nonexistent Guid, and there's no database foreign key either.
        _ingredientRepository.ExistsByCodeAsync("oat-milk", Arg.Any<CancellationToken>()).Returns(false);
        _ingredientRepository.GetCategoryCodesAsync(Arg.Any<CancellationToken>())
            .Returns(new Dictionary<Guid, string> { [Guid.NewGuid()] = "milk" });

        var act = () => _sut.Handle(ValidCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<IngredientCategoryNotFoundException>();
        _ingredientRepository.DidNotReceive().Add(Arg.Any<Ingredient>());
    }

    [Fact]
    public async Task Handle_KnownIngredientCategoryId_AddsIngredientAndReturnsItsCategoryCode()
    {
        var categoryId = Guid.NewGuid();
        _ingredientRepository.ExistsByCodeAsync("oat-milk", Arg.Any<CancellationToken>()).Returns(false);
        _ingredientRepository.GetCategoryCodesAsync(Arg.Any<CancellationToken>())
            .Returns(new Dictionary<Guid, string> { [categoryId] = "milk" });

        var dto = await _sut.Handle(ValidCommand(categoryId), CancellationToken.None);

        dto.Category.Should().Be("milk");
        _ingredientRepository.Received(1).Add(Arg.Is<Ingredient>(i => i != null && i.Code == "oat-milk"));
    }
}
