import { createFileRoute } from "@tanstack/react-router";
import { TableCell, TableHead } from "@/components/ui/table";
import { BookingsView, type BaseBooking } from "@/components/admin/BookingsView";

interface StudioBooking extends BaseBooking {
  session_type: string;
  crew_size: string;
  duration: string;
}

export const Route = createFileRoute("/admin/studio-bookings")({
  head: () => ({
    meta: [
      { title: "Studio Bookings - Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminStudioBookingsPage,
});

function AdminStudioBookingsPage() {
  return (
    <BookingsView<StudioBooking>
      table="studio_bookings"
      title="Studio Bookings"
      subtitle="Studio session bookings · review, filter and update status"
      searchPlaceholder="Search name, email, session type…"
      searchFields={["session_type"]}
      renderDetailHead={() => (
        <>
          <TableHead>Session</TableHead>
          <TableHead>Crew · Duration</TableHead>
        </>
      )}
      renderDetailCells={(r) => (
        <>
          <TableCell>
            <div className="text-sm">{r.session_type}</div>
            {r.notes && (
              <div className="text-xs text-muted-foreground line-clamp-2 max-w-xs mt-1">
                {r.notes}
              </div>
            )}
          </TableCell>
          <TableCell className="text-sm">
            {r.crew_size} · {r.duration}
          </TableCell>
        </>
      )}
    />
  );
}