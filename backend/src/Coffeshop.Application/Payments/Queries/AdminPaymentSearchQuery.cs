using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Dtos;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Application.Payments.Mapping;
using MediatR;

namespace Coffeshop.Application.Payments.Queries;

/// <summary>GET /api/v1/admin/payments — every payment, any status, admin/staff-only (<c>PermissionCodes.ViewPayments</c>, enforced at the endpoint). A filtered call into the same <see cref="IPaymentRepository.GetPagedAsync"/> <c>ListPaymentsQuery</c> uses, matching <c>GetOrdersQuery</c>/<c>GetMyOrdersQuery</c>'s own "different query classes, one shared repository method" precedent.</summary>
public sealed record AdminPaymentSearchQuery(PaymentFilter Filter, PageRequest Page) : IQuery<PagedResult<PaymentSummaryDto>>;

internal sealed class AdminPaymentSearchQueryHandler(IPaymentRepository paymentRepository, IOrderRepository orderRepository)
    : IRequestHandler<AdminPaymentSearchQuery, PagedResult<PaymentSummaryDto>>
{
    public async Task<PagedResult<PaymentSummaryDto>> Handle(AdminPaymentSearchQuery request, CancellationToken ct)
    {
        var (items, totalCount) = await paymentRepository.GetPagedAsync(request.Filter, request.Page.SkipCount, request.Page.ClampedPageSize, ct);
        var orderNumbers = await orderRepository.GetOrderNumbersByIdsAsync(items.Select(p => p.OrderId), ct);

        return new PagedResult<PaymentSummaryDto>(
            [.. items.Select(p => p.ToSummaryDto(orderNumbers.GetValueOrDefault(p.OrderId)))],
            request.Page.Page,
            request.Page.ClampedPageSize,
            totalCount);
    }
}
