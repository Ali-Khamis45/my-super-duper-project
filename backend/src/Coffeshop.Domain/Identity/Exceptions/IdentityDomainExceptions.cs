using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity.Exceptions;

public sealed class InvalidEmailException(string message) : DomainException(message);

public sealed class InvalidFullNameException(string message) : DomainException(message);

/// <summary>
/// Thrown by <see cref="User"/> on a failed credential check. Deliberately the same
/// exception/message for "no such user" and "wrong password" — the API layer returns a
/// generic 401 regardless, per docs/33_AUTH_ARCHITECTURE.md's login sequence (never leaking
/// which check failed) and docs/36_SECURITY_MODEL.md's account-enumeration mitigation.
/// </summary>
public sealed class InvalidCredentialsException()
    : DomainException("The email or password is incorrect.");

public sealed class EmailNotVerifiedException()
    : DomainException("This account's email address has not been verified yet.");

public sealed class EmailAlreadyRegisteredException()
    : DomainException("An account with this email address already exists.");

/// <summary>
/// Thrown for an expired, already-consumed, or unrecognized refresh/verification/reset
/// token. One exception type for all three token kinds — the API layer maps it to 401
/// uniformly, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's exception-handling rules.
/// </summary>
public sealed class InvalidOrExpiredTokenException(string message) : DomainException(message);

/// <summary>
/// Thrown when an already-rotated (single-use) refresh token is redeemed a second time — the
/// security response is a full revoke-all for that user, per
/// docs/33_AUTH_ARCHITECTURE.md's silent-refresh sequence diagram.
/// </summary>
public sealed class RefreshTokenReuseDetectedException()
    : DomainException("This refresh token has already been used. All sessions for this account have been revoked.");
