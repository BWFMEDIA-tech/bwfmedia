import { createFileRoute } from "@tanstack/react-router";
import { FriendPlusButton } from "@/components/artist/FriendPlusButton";

export const Route = createFileRoute("/friend-plus-preview")({
  head: () => ({
    meta: [
      { title: "Friend button preview" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Preview,
});

function Preview() {
  return (
    <div className="min-h-screen bg-background p-10 text-foreground">
      <h1 className="mb-6 text-lg font-semibold">Friend button preview</h1>
      <div className="flex items-end gap-10">
        <div className="relative h-[96px] w-[96px]">
          <img
            src="https://picsum.photos/seed/tile/96/96"
            alt=""
            className="h-[96px] w-[96px] rounded-full border-2 border-[#0d0d18] object-cover"
          />
          <FriendPlusButton userId="2730c416-7a83-470d-9e71-c8eeff0835e4" displayName="BlkExx" />
        </div>
        <p className="text-sm text-white/60">
          The + sits in the bottom-left corner of the photo, mirroring the mic badge on the right.
        </p>
      </div>
    </div>
  );
}
