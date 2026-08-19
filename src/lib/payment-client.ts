import { parseProblemDetails } from "./api-errors";
import { authorizedFetch } from "./auth-client";
import type { PagedResultDto } from "./catalog-types";

/**
 * Sprint 5.5 — the real Payments Platform client, same `authorizedFetch` + RFC 9457
 * problem-details convention every other `*-client.ts` in this project follows
 * (`order-client.ts` is the closest sibling; this file mirrors its shape exactly rather than
 * inventing a new one). `/create-session`/`/confirm`/`/cancel` are `AllowAnonymous` server-side
 * (a guest checkout has no account), so `authorizedFetch` still works for them — it only
 * attaches a bearer token when one actually exists, same as `order-client.ts`'s own note.
 */

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

export interface PaymentAttemptDto {
  id: string;
  status: string;
  providerReference: string | null;
  methodDescription: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  declineCode: string | null;
  startedAtUtc: string;
  resolvedAtUtc: string | null;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  orderNumber: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  refundedAmount: number;
  attempts: PaymentAttemptDto[];
  createdAtUtc: string;
}

export interface PaymentSummaryDto {
  id: string;
  orderId: string;
  orderNumber: string | null;
  amount: number;
  status: string;
  provider: string;
  createdAtUtc: string;
}

export interface PaymentSessionDto {
  paymentId: string;
  attemptId: string;
  provider: string;
  clientSecret: string | null;
  publishableKey: string | null;
  status: string;
}

export interface PaymentReceiptLineDto {
  productName: string;
  quantity: number;
  lineTotal: number;
}

export interface PaymentReceiptDto {
  paymentId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  methodDescription: string | null;
  paidAtUtc: string | null;
  items: PaymentReceiptLineDto[];
}

export async function createCheckoutSession(orderId: string): Promise<PaymentSessionDto> {
  const response = await authorizedFetch("/api/v1/payments/create-session", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ orderId }),
  });
  return readJson(response);
}

export async function confirmPayment(paymentId: string): Promise<PaymentDto> {
  const response = await authorizedFetch(`/api/v1/payments/${paymentId}/confirm`, { method: "POST" });
  return readJson(response);
}

export async function cancelPayment(paymentId: string, reason: string | null): Promise<PaymentDto> {
  const response = await authorizedFetch(`/api/v1/payments/${paymentId}/cancel`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ reason }),
  });
  return readJson(response);
}

export async function getPayment(id: string): Promise<PaymentDto> {
  const response = await authorizedFetch(`/api/v1/payments/${id}`);
  return readJson(response);
}

export async function getPaymentReceipt(id: string): Promise<PaymentReceiptDto> {
  const response = await authorizedFetch(`/api/v1/payments/${id}/receipt`);
  return readJson(response);
}

export async function getMyPayments(page = 1, pageSize = 20): Promise<PagedResultDto<PaymentSummaryDto>> {
  const response = await authorizedFetch(`/api/v1/payments/history?page=${page}&pageSize=${pageSize}`);
  return readJson(response);
}

// Admin/staff — `PermissionCodes.ProcessRefunds`/`ViewPayments`, enforced server-side.

export async function capturePayment(id: string): Promise<PaymentDto> {
  const response = await authorizedFetch(`/api/v1/payments/${id}/capture`, { method: "POST" });
  return readJson(response);
}

export async function refundPayment(id: string, amount: number | null, reason: string | null): Promise<PaymentDto> {
  const response = await authorizedFetch(`/api/v1/payments/${id}/refund`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ amount, reason }),
  });
  return readJson(response);
}

export interface AdminPaymentFilter {
  status?: string;
  orderId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminPayments(filter: AdminPaymentFilter = {}): Promise<PagedResultDto<PaymentSummaryDto>> {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.orderId) params.set("orderId", filter.orderId);
  if (filter.search) params.set("search", filter.search);
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  const response = await authorizedFetch(`/api/v1/admin/payments?${params}`);
  return readJson(response);
}
