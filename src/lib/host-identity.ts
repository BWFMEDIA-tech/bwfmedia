/**
 * Brand/Network identity helper.
 *
 * When a user has a `brand_name` (organization / network / brand account),
 * that identity replaces their personal name and avatar EVERYWHERE on stage:
 * roster, video tiles, audio tiles, chat header, host badges, audience view.
 *
 * Personal name is only shown in account/settings screens.
 */

export const IDENTITY_COLUMNS = "id, display_name, avatar_url, brand_name, brand_avatar_url";

export type IdentityProfile = {
  display_name?: string | null;
  avatar_url?: string | null;
  brand_name?: string | null;
  brand_avatar_url?: string | null;
};

export type EffectiveIdentity = {
  display_name: string | null;
  avatar_url: string | null;
  is_brand: boolean;
};

export function effectiveIdentity(p: IdentityProfile | null | undefined): EffectiveIdentity {
  const brand = (p?.brand_name ?? "").trim();
  if (brand) {
    return {
      display_name: brand,
      avatar_url: p?.brand_avatar_url ?? p?.avatar_url ?? null,
      is_brand: true,
    };
  }
  return {
    display_name: p?.display_name ?? null,
    avatar_url: p?.avatar_url ?? null,
    is_brand: false,
  };
}