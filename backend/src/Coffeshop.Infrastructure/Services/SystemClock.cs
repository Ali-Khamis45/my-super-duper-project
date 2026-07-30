using Coffeshop.Application.Common.Interfaces;

namespace Coffeshop.Infrastructure.Services;

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
