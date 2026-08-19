using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Dtos;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Application.Payments.Mapping;
using MediatR;

namespace Coffeshop.Application.Payments.Queries;

/// <summary>GET /api/v1/payments/history — the authenticated caller's own payment history, never another customer's; <c>CustomerId</c> is always derived from the JWT, never accepted as a request parameter — the same discipline <c>GetMyOrdersQuery</c> already established.</summary>
public sealed record ListPaymentsQuery(PageRequest Page) : IQuery<PagedResult<PaymentSummaryDto>>;

internal sealed class ListPaymentsQueryHandler(IPaymentRepository paymentRepository, IOrderRepository orderRepository, ICurrentUserService currentUserService)
    : IRequestHandler<ListPaymentsQuery, PagedResult<PaymentSummaryDto>>
{
    public async Task<PagedResult<PaymentSummaryDto>> Handle(ListPaymentsQuery request, CancellationToken ct)
    {
        var customerId = currentUserService.UserId ?? Guid.Empty; // No account, no history — an empty result, never every guest payment.
        var filter = new PaymentFilter(CustomerId: customerId);

        var (items, totalCount) = await paymentRepository.GetPagedAsync(filter, request.Page.SkipCount, request.Page.ClampedPageSize, ct);
        var orderNumbers = await orderRepository.GetOrderNumbersByIdsAsync(items.Select(p => p.OrderId), ct);

        return new PagedResult<PaymentSummaryDto>(
            [.. items.Select(p => p.ToSummaryDto(orderNumbers.GetValueOrDefault(p.OrderId)))],
            request.Page.Page,
            request.Page.ClampedPageSize,
            totalCount);
    }
}
