import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/settings/merch")({
  component: () => (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
      <ShoppingBag className="mx-auto h-8 w-8 text-red-500" />
      <h1 className="mt-3 text-xl font-black">Merch Store</h1>
      <p className="mt-1 text-sm text-white/60">Full product manager coming soon. For now, manage previews from your Profile tab.</p>
    </div>
  ),
});