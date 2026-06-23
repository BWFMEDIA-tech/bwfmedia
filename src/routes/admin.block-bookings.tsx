import { createFileRoute } from "@tanstack/react-router";
import { TableCell, TableHead } from "@/components/ui/table";
import { BookingsView, type BaseBooking } from "@/components/admin/BookingsView";

interface BlockBooking extends BaseBooking {
  shoot_type: string;
  location: string;
}

export const Route = createFileRoute("/admin/block-bookings")({
  head: () => ({
    meta: [
      { title: "Off The Block Bookings - Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBlockBookingsPage,
});

function AdminBlockBookingsPage() {
  return (
    <BookingsView<BlockBooking>
      table="block_bookings"
      title="Off The Block Bookings"
      subtitle="Off The Block shoot bookings · review, filter and update status"
      searchPlaceholder="Search name, email, shoot type, location…"
      searchFields={["shoot_type", "location"]}
      renderDetailHead={() => (
        <>
          <TableHead>Shoot</TableHead>
          <TableHead>Location</TableHead>
        </>
      )}
      renderDetailCells={(r) => (
        <>
          <TableCell>
            <div className="text-sm">{r.shoot_type}</div>
            {r.notes && (
              <div className="text-xs text-muted-foreground line-clamp-2 max-w-xs mt-1">
                {r.notes}
              </div>
            )}
          </TableCell>
          <TableCell className="text-sm">{r.location}</TableCell>
        </>
      )}
    />
  );
}