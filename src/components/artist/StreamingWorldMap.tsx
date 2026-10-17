import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

import { countryStreams } from "@/lib/playback-progress";

type MapCountry = { type: "Feature"; id?: string | number; properties?: Record<string, unknown> };

const countries = (feature(world as any, (world as any).objects.countries) as any).features as MapCountry[];
const projection = geoNaturalEarth1().fitSize([1000, 440], { type: "FeatureCollection", features: countries } as any);
const path = geoPath(projection);

export function StreamingWorldMap({ countries: streamCountries }: { countries: Array<{ name: string; streams: number }> }) {
  const hasLocationData = streamCountries.some(c => c.name !== "Unknown" && c.streams > 0);
  return (
    <div className="relative min-h-[240px] overflow-hidden rounded-md border border-border bg-background/35 sm:min-h-[320px]">
      <svg viewBox="0 0 1000 440" role="img" aria-label="World map showing stream locations" className="h-full min-h-[240px] w-full sm:min-h-[320px]">
        <defs>
          <linearGradient id="stream-map-fill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--brand-cyan)" stopOpacity="0.76" />
            <stop offset="1" stopColor="var(--brand-blue)" stopOpacity="0.58" />
          </linearGradient>
        </defs>
        {countries.map((country, index) => (
          <path
            key={`${country.id ?? "country"}-${index}`}
            d={path(country as any) ?? undefined}
            fill={countryStreams(String(country.properties?.name ?? ""), streamCountries) > 0 ? "url(#stream-map-fill)" : "var(--muted)"}
            fillOpacity={countryStreams(String(country.properties?.name ?? ""), streamCountries) > 0 ? 0.9 : 0.35}
            stroke="var(--background)"
            strokeWidth="0.7"
          ><title>{String(country.properties?.name ?? "Country")}: {countryStreams(String(country.properties?.name ?? ""), streamCountries)} streams</title></path>
        ))}
      </svg>
      {!hasLocationData ? (
        <div className="absolute inset-0 grid place-items-center bg-background/20 px-6 text-center backdrop-blur-[1px]">
          <div>
            <div className="text-sm font-semibold text-foreground">Location data will appear here</div>
            <div className="mt-1 text-xs text-muted-foreground">New streams with country and city information populate the map automatically.</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}