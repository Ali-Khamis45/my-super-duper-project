using System.Reflection;
using Coffeshop.Application.Common.Behaviors;
using Coffeshop.Application.Inventory.Coordination;
using Coffeshop.Application.Payments.Coordination;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace Coffeshop.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // Pipeline behaviors via cfg.AddOpenBehavior — MediatR 12+'s own documented
        // registration API, preferred over a raw services.AddTransient(typeof(IPipelineBehavior<,>), ...)
        // even though both wire correctly; this is the idiomatic form, not a bug fix in itself.
        // Order matters: Logging wraps everything (including validation failures), Validation
        // runs before the handler, UnitOfWork saves only after a successful command handler —
        // per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md.
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
            cfg.AddOpenBehavior(typeof(UnitOfWorkBehavior<,>));
        });

        // AddValidatorsFromAssembly only finds *public* IValidator<T> types (it scans
        // Assembly.GetExportedTypes()) — every validator in this project must be public, never
        // internal, or it's silently never registered. A real bug found during this sprint's
        // manual verification: every validator here was originally `internal`, compiled clean,
        // and FluentValidation simply never ran for any command (an empty password registered
        // successfully) — no error, no warning, just silence. Caught only by actually exercising
        // the API, not by any static check.
        services.AddValidatorsFromAssembly(assembly);

        // internal, not public — its implementation is a plain in-process orchestrator over
        // Application-layer repository interfaces, never called from outside this assembly. See
        // IInventoryReservationCoordinator's own doc comment for why it isn't a MediatR command.
        services.AddScoped<IInventoryReservationCoordinator, InventoryReservationCoordinator>();

        // internal, not public — same reasoning as IInventoryReservationCoordinator above, one
        // bounded-context layer further out (Payments -> Ordering -> Inventory). See
        // IOrderPaymentCoordinator's own doc comment.
        services.AddScoped<IOrderPaymentCoordinator, OrderPaymentCoordinator>();

        return services;
    }
}
