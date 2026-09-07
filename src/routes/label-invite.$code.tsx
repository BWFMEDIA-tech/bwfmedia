import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { acceptLabelInvite } from "@/lib/labels.functions";

export const Route = createFileRoute("/label-invite/$code")({
  head: () => ({
    meta: [
      { title: "Label invite — Tunevio" },
      { name: "description", content: "Accept your invitation to join a label team or roster on Tunevio." },
      { property: "og:title", content: "Label invite — Tunevio" },
      { property: "og:description", content: "Accept your invitation to join a label team or roster on Tunevio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LabelInvitePage,
});

function LabelInvitePage() {
  const { code } = Route.useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const runAccept = useServerFn(acceptLabelInvite);

  const accept = useMutation({
    mutationFn: () => runAccept({ data: { code } }),
    onSuccess: (res: any) => {
      toast.success("Invite accepted");
      if (res?.kind === "artist") navigate({ to: "/labels" });
      else navigate({ to: "/labels/$labelId", params: { labelId: res.label_id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not accept invite"),
  });

  return (
    <div className="min-h-screen bg-[#050509] text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0d0d18] p-8 text-center">
        <Building2 className="w-10 h-10 text-[#C53DFF] mx-auto mb-4" />
        <h1 className="text-2xl font-black mb-2">You've been invited to a label</h1>
        <p className="text-white/60 mb-6">Accept to join the label on Tunevio.</p>
        {auth.user ? (
          <button
            onClick={() => accept.mutate()}
            disabled={accept.isPending}
            className="w-full px-5 py-3 rounded-xl font-semibold text-black bg-[#00E6FF] disabled:opacity-40"
          >
            {accept.isPending ? "Joining…" : "Accept invite"}
          </button>
        ) : (
          <Link to="/login" className="inline-block w-full px-5 py-3 rounded-xl font-semibold text-black bg-[#00E6FF]">
            Sign in to accept
          </Link>
        )}
      </div>
    </div>
  );
}
