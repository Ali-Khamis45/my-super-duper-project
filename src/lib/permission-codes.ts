/** Mirrors `Coffeshop.Domain.Identity.Permission`'s `PermissionCodes` constants exactly — same string values, not re-derived. */
export const PermissionCodes = {
  ManageProducts: "products:manage",
  /** Sprint 5.3 */
  ViewOrders: "orders:view",
  /** Sprint 5.3 */
  UpdateOrderStatus: "orders:update-status",
  /** Sprint 5.4 */
  ViewInventory: "inventory:view",
  /** Sprint 5.4 */
  AdjustInventory: "inventory:adjust",
  /** Sprint 5.5 */
  ViewPayments: "payments:view",
  /** Sprint 5.5 — already frozen in Phase 0, seeded Admin-only (never Staff); reused as-is. */
  ProcessRefunds: "refunds:process",
} as const;
