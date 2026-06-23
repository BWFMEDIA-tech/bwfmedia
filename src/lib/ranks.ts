import bronze from "@/assets/badge-bronze-performer.png";
import silver from "@/assets/badge-silver-artist.png";
import gold from "@/assets/badge-gold-creator.png";
import diamond from "@/assets/badge-diamond-star.png";
import platinum from "@/assets/badge-platinum-icon.png";
import superstar from "@/assets/badge-superstar.png";
import legend from "@/assets/badge-legend-elite.png";

export type RankKey = "bronze" | "silver" | "gold" | "diamond" | "platinum" | "superstar" | "legend";

export interface RankDef {
  key: RankKey;
  name: string;
  floor: number;
  cap: number | null;
  image: string;
  color: string;
  glow: string;
}

export const RANKS: RankDef[] = [
  { key: "bronze",    name: "Bronze Performer", floor: 0,      cap: 2000,   image: bronze,    color: "#C97D3F", glow: "rgba(201,125,63,0.55)" },
  { key: "silver",    name: "Silver Artist",    floor: 2000,   cap: 5000,   image: silver,    color: "#D9DEE7", glow: "rgba(217,222,231,0.55)" },
  { key: "gold",      name: "Gold Creator",     floor: 5000,   cap: 10000,  image: gold,      color: "#F5C542", glow: "rgba(245,197,66,0.65)" },
  { key: "diamond",   name: "Diamond Star",     floor: 10000,  cap: 25000,  image: diamond,   color: "#00E6FF", glow: "rgba(0,230,255,0.65)" },
  { key: "platinum",  name: "Platinum Icon",    floor: 25000,  cap: 50000,  image: platinum,  color: "#C53DFF", glow: "rgba(197,61,255,0.7)" },
  { key: "superstar", name: "Superstar",        floor: 50000,  cap: 100000, image: superstar, color: "#FF00A6", glow: "rgba(255,0,166,0.7)" },
  { key: "legend",    name: "Legend",           floor: 100000, cap: null,     image: legend,    color: "#C53DFF", glow: "rgba(197,61,255,0.75)" },
];

export function getRankFromXp(xp: number | null | undefined): RankDef {
  const x = Math.max(0, xp ?? 0);
  let current = RANKS[0];
  for (const r of RANKS) {
    if (x >= r.floor) current = r;
  }
  return current;
}