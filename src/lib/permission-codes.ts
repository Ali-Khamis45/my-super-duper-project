/** Mirrors `Coffeshop.Domain.Identity.Permission`'s `PermissionCodes` constants exactly — same string values, not re-derived. */
export const PermissionCodes = {
  ManageProducts: "products:manage",
  /** Sprint 5.3 */
  ViewOrders: "orders:view",
  /** Sprint 5.3 */
  UpdateOrderStatus: "orders:update-status",
} as const;
