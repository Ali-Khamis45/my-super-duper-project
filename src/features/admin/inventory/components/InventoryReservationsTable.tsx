"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InventoryReservationDto } from "@/lib/inventory-client";

import { useInventoryMutations } from "../hooks/useInventoryMutations";
import { ReservationStatusBadge } from "./ReservationStatusBadge";

interface InventoryReservationsTableProps {
  reservations: InventoryReservationDto[];
  isLoading: boolean;
}

/** The "Reservation viewer" piece of this sprint's own Phase 6 brief — every hold `IInventoryReservationCoordinator` has created, real state and real expiry, with a manual "Expire now" action for the rare stuck-hold case (see `ExpireReservationCommand`'s own doc comment). */
export function InventoryReservationsTable({ reservations, isLoading }: InventoryReservationsTableProps) {
  const mutations = useInventoryMutations();

  if (!isLoading && reservations.length === 0) {
    return <p className="text-muted-foreground py-12 text-center text-sm">No reservations match these filters.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ingredient</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reservations.map((reservation) => (
          <TableRow key={reservation.id}>
            <TableCell className="font-medium">{reservation.ingredientName}</TableCell>
            <TableCell className="text-muted-foreground text-xs">{reservation.orderNumber ?? reservation.orderId}</TableCell>
            <TableCell>{reservation.quantity}</TableCell>
            <TableCell>
              <ReservationStatusBadge status={reservation.status} />
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">{new Date(reservation.expiresAtUtc).toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {reservation.status === "active" && (
                <Button size="sm" variant="ghost" disabled={mutations.expireReservation.isPending} onClick={() => mutations.expireReservation.mutate(reservation.id)}>
                  Expire now
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
