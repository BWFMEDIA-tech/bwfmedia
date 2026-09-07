import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const LABEL_ROLES = ["owner", "manager", "anr", "finance"] as const;
export type LabelRole = (typeof LABEL_ROLES)[number];

export const LABEL_ROLE_META: Record<LabelRole, { label: string; blurb: string; color: string }> = {
  owner: { label: "Owner", blurb: "Full control of the label, team and roster", color: "#C53DFF" },
  manager: { label: "Manager", blurb: "Edit and submit releases, manage roster", color: "#00E6FF" },
  anr: { label: "A&R", blurb: "View releases and manage the roster", color: "#FF00A6" },
  finance: { label: "Finance", blurb: "View releases and earnings only", color: "#4ade80" },
};

export const LABEL_PERMISSIONS = {
  editLabel: ["owner", "manager"],
  manageTeam: ["owner", "manager"],
  manageRoster: ["owner", "manager", "anr"],
  editReleases: ["owner", "manager"],
  viewEarnings: ["owner", "manager", "finance"],
} as const;

export function labelCan(role: LabelRole | null | undefined, action: keyof typeof LABEL_PERMISSIONS) {
  if (!role) return false;
  return (LABEL_PERMISSIONS[action] as readonly string[]).includes(role);
}

const uuid = z.object({ id: z.string().uuid() });

async function roleFor(context: any, labelId: string): Promise<LabelRole | null> {
  const { data, error } = await context.supabase
    .from("label_members")
    .select("role")
    .eq("label_id", labelId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.role as LabelRole) ?? null;
}

async function requireRole(context: any, labelId: string, action: keyof typeof LABEL_PERMISSIONS) {
  const role = await roleFor(context, labelId);
  if (!labelCan(role, action)) throw new Error("You don't have permission to do that");
  return role as LabelRole;
}

async function profileMap(context: any, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>();
  const { data } = await context.supabase
    .from("public_profiles")
    .select("id, display_name, avatar_url")
    .in("id", unique);
  return new Map((data ?? []).filter((p: any) => !!p.id).map((p: any) => [p.id as string, p]));
}

// ---------- Labels ----------

export const listMyLabels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_my_labels");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      label_id: string;
      name: string;
      slug: string | null;
      logo_url: string | null;
      role: LabelRole;
      roster_count: number;
      member_count: number;
    }>;
  });

export const createLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(2).max(120),
        slug: z.string().max(60).optional(),
        bio: z.string().max(2000).optional(),
        website: z.string().max(300).optional(),
        logo_url: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_label", {
      _name: data.name,
      _slug: data.slug ?? undefined,
      _bio: data.bio ?? undefined,
      _website: data.website ?? undefined,
      _logo_url: data.logo_url ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(2).max(120).optional(),
        bio: z.string().max(2000).nullable().optional(),
        website: z.string().max(300).nullable().optional(),
        logo_url: z.string().max(1000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, data.id, "editLabel");
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("labels").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getLabel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => uuid.parse(d))
  .handler(async ({ data, context }) => {
    const role = await roleFor(context, data.id);
    if (!role) throw new Error("You are not part of this label");

    const [{ data: label, error: lerr }, members, roster, invites] = await Promise.all([
      context.supabase.from("labels").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("label_members").select("*").eq("label_id", data.id).order("created_at"),
      context.supabase.from("label_artists").select("*").eq("label_id", data.id).order("created_at"),
      context.supabase
        .from("label_invites")
        .select("*")
        .eq("label_id", data.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    if (lerr) throw new Error(lerr.message);
    if (!label) throw new Error("Label not found");

    const memberRows = (members.data ?? []) as any[];
    const rosterRows = (roster.data ?? []) as any[];
    const profiles = await profileMap(context, [
      ...memberRows.map((m) => m.user_id),
      ...rosterRows.map((r) => r.artist_id),
    ]);

    const activeArtistIds = rosterRows.filter((r) => r.status === "active").map((r) => r.artist_id);
    let releases: any[] = [];
    if (activeArtistIds.length) {
      const { data: rel } = await context.supabase
        .from("distribution_releases")
        .select("id, title, artist_name, status, release_type, artwork_url, release_date, user_id, created_at")
        .in("user_id", activeArtistIds)
        .order("created_at", { ascending: false })
        .limit(60);
      releases = rel ?? [];
    }

    return {
      role,
      label,
      members: memberRows.map((m) => ({ ...m, profile: profiles.get(m.user_id) ?? null })),
      roster: rosterRows.map((r) => ({ ...r, profile: profiles.get(r.artist_id) ?? null })),
      invites: invites.data ?? [],
      releases,
    };
  });

// ---------- Team ----------

export const createLabelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        label_id: z.string().uuid(),
        kind: z.enum(["team", "artist"]),
        role: z.enum(LABEL_ROLES).optional(),
        email: z.string().email().max(200).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, data.label_id, data.kind === "artist" ? "manageRoster" : "manageTeam");
    const code = `lbl_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
    const { error } = await context.supabase.from("label_invites").insert({
      label_id: data.label_id,
      code,
      kind: data.kind,
      role: data.kind === "artist" ? "manager" : (data.role ?? "manager"),
      email: data.email || null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { code };
  });

export const revokeLabelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), label_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, data.label_id, "manageTeam");
    const { error } = await context.supabase
      .from("label_invites")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("label_id", data.label_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), label_id: z.string().uuid(), role: z.enum(LABEL_ROLES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const myRole = await requireRole(context, data.label_id, "manageTeam");
    if (data.role === "owner" && myRole !== "owner") throw new Error("Only an owner can grant ownership");
    const { error } = await context.supabase
      .from("label_members")
      .update({ role: data.role })
      .eq("id", data.id)
      .eq("label_id", data.label_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), label_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context, data.label_id, "manageTeam");
    const { data: row } = await context.supabase
      .from("label_members")
      .select("role, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.role === "owner") throw new Error("The label owner cannot be removed");
    const { error } = await context.supabase.from("label_members").delete().eq("id", data.id).eq("label_id", data.label_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Roster ----------

export const setRosterStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        label_id: z.string().uuid(),
        status: z.enum(["pending", "active", "removed"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context, data.label_id, "manageRoster");
    const { error } = await context.supabase
      .from("label_artists")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("label_id", data.label_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Invites (invitee side) ----------

export const acceptLabelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(4).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("accept_label_invite", { _code: data.code });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; label_id: string; kind: string };
  });

export const listMyLabelMemberships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("label_artists")
      .select("id, label_id, status, created_at")
      .eq("artist_id", context.userId);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) return [] as Array<{ id: string; label_id: string; status: string; name: string; logo_url: string | null }>;
    const { data: labels } = await context.supabase
      .from("labels")
      .select("id, name, logo_url")
      .in("id", rows.map((r: any) => r.label_id));
    const byId = new Map((labels ?? []).map((l: any) => [l.id, l]));
    return rows.map((r: any) => ({
      id: r.id,
      label_id: r.label_id,
      status: r.status,
      name: byId.get(r.label_id)?.name ?? "Label",
      logo_url: byId.get(r.label_id)?.logo_url ?? null,
    }));
  });

export const leaveLabel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => uuid.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("label_artists")
      .update({ status: "removed" })
      .eq("id", data.id)
      .eq("artist_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
