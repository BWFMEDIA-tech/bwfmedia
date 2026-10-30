import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CloudUpload, FileSpreadsheet, Info, Lock, Music2, Disc3, Users, AudioLines, MoreHorizontal, X, Download, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { ArtistDashboardShell } from "@/components/artist/ArtistDashboardShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { hasArtistTools } from "@/lib/artist-navigation";
import { validateCatalog, catalogStats, MAX_CATALOG_FILE_BYTES, REQUIRED_COLUMNS, OPTIONAL_COLUMNS, type ParsedCatalog } from "@/lib/catalog-import";
import { listCatalogImports, runCatalogImport } from "@/lib/catalog-import.functions";

export const Route = createFileRoute("/import-catalog")({
  head: () => ({ meta: [
    { title: "Import Your Catalog — Tunevio" },
    { name: "description", content: "Bring your existing music catalog from any distributor into Tunevio as draft releases." },
    { property: "og:title", content: "Import Your Catalog — Tunevio" },
    { property: "og:description", content: "Upload a distributor catalog export and review it before it lands in Tunevio." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: () => <ArtistDashboardShell><ImportCatalogPage /></ArtistDashboardShell>,
});

const DISTRIBUTORS = ["DistroKid", "TuneCore", "CD Baby", "UnitedMasters", "Amuse", "LANDR", "Symphonic", "Ditto Music", "RouteNote", "AWAL", "Other"];
const STEPS = [
  { t: "Select Source", d: "Choose your distributor" },
  { t: "Upload File", d: "Add your catalog export" },
  { t: "Review & Match", d: "We validate your catalog" },
  { t: "Import Complete", d: "Your music is in Tunevio" },
];
const STATUS: Record<string, string> = {
  completed: "bg-primary/15 text-primary", partial: "bg-accent/30 text-accent-foreground",
  processing: "bg-secondary text-secondary-foreground", failed: "bg-destructive/20 text-destructive",
};

function ImportCatalogPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listCatalogImports);
  const runFn = useServerFn(runCatalogImport);
  const inputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const [step, setStep] = useState(0);
  const [distributor, setDistributor] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<any>(null);

  const isArtist = hasArtistTools(auth.roles ?? []);
  const imports = useQuery({ queryKey: ["catalog-imports"], queryFn: () => listFn(), enabled: !!auth.user && isArtist });
  const parsed: ParsedCatalog | null = useMemo(() => (csv ? validateCatalog(csv) : null), [csv]);
  const stats = parsed ? catalogStats(parsed.rows) : null;
  const totals = useMemo(() => (imports.data ?? []).reduce((a: any, r: any) => ({
    tracks: a.tracks + r.tracks_imported, releases: a.releases + r.releases_imported, artists: Math.max(a.artists, r.artists_detected), isrcs: a.isrcs + r.isrcs_found,
  }), { tracks: 0, releases: 0, artists: 0, isrcs: 0 }), [imports.data]);

  const run = useMutation({
    mutationFn: () => runFn({ data: { idempotencyKey: key, distributor: distributor!, fileName: file!.name, fileSize: file!.size, csv: csv! } }),
    onSuccess: (r) => { setResult(r); setStep(3); qc.invalidateQueries({ queryKey: ["catalog-imports"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });

  const pick = (f: File | undefined) => {
    setFileError(null); setCsv(null); setProgress(0); setResult(null); setKey(crypto.randomUUID());
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) { setFile(null); return setFileError("Only CSV files are supported. In Excel or Google Sheets, use File → Save as / Download → CSV."); }
    if (f.size === 0) { setFile(null); return setFileError("That file is empty."); }
    if (f.size > MAX_CATALOG_FILE_BYTES) { setFile(null); return setFileError("File is larger than 5 MB."); }
    setFile(f);
    const r = new FileReader(); readerRef.current = r;
    r.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    r.onload = () => { setProgress(100); setCsv(String(r.result ?? "")); };
    r.onerror = () => setFileError("Could not read the file.");
    r.onabort = () => { setFile(null); setProgress(0); };
    r.readAsText(f);
  };
  const cancel = () => { readerRef.current?.abort(); setFile(null); setCsv(null); setProgress(0); };
  const downloadErrors = () => {
    const errs = (result?.errors ?? parsed?.errors ?? []) as { row: number; message: string }[];
    const body = "row,message\n" + errs.map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" })); a.download = "import-errors.csv"; a.click();
  };
  const canNext = [!!distributor, !!parsed && !parsed.missingColumns.length && parsed.rows.length > 0, true, false][step];

  if (auth.user && !isArtist) return <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center"><h1 className="text-2xl font-bold">Import Catalog is for artists</h1><p className="mt-2 text-muted-foreground">Upgrade to an artist account to import your music.</p><Button asChild className="mt-4"><Link to="/signup">Become an artist</Link></Button></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Import Your <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Catalog</span></h1>
        <p className="mt-1 text-muted-foreground">Bring your existing music from any distributor to Tunevio.</p>
      </header>

      <ol className="grid grid-cols-2 gap-4 md:flex md:items-center">
        {STEPS.map((s, i) => (
          <li key={s.t} className="flex flex-1 items-center gap-3">
            <button type="button" disabled={i > step || step === 3} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-lg font-semibold transition ${i === step ? "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.6)]" : i < step ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
              {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
            </button>
            <div className="min-w-0"><div className="text-sm font-semibold">{s.t}</div><div className="text-xs text-muted-foreground">{s.d}</div></div>
            {i < 3 && <div className="hidden h-px flex-1 bg-border md:block" />}
          </li>
        ))}
      </ol>

      {step === 0 && <section className="rounded-2xl border border-border bg-card/60 p-5">
        <h2 className="text-xl font-semibold">Select Your Distributor</h2>
        <p className="text-sm text-muted-foreground">Choose where your catalog is currently hosted. Direct account connections aren't available yet — you'll upload the catalog export from your distributor's dashboard.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {DISTRIBUTORS.map((d) => {
            const on = distributor === d;
            return <button key={d} type="button" aria-pressed={on} onClick={() => setDistributor(on ? null : d)}
              className={`relative flex h-28 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition hover:border-primary/60 hover:bg-primary/5 ${on ? "border-primary bg-primary/10 shadow-[0_0_16px_hsl(var(--primary)/0.35)]" : "border-border bg-background/40"}`}>
              <span className={`absolute right-2 top-2 h-4 w-4 rounded-full border-2 ${on ? "border-primary bg-primary" : "border-muted-foreground/50"}`} />
              {d === "Other" ? <MoreHorizontal className="h-8 w-8 text-primary" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-lg font-bold text-primary">{d.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>}
              {d}<span className="text-[10px] text-muted-foreground">CSV export</span>
            </button>;
          })}
        </div>
      </section>}

      {step === 1 && <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`flex flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center transition ${drag ? "border-primary bg-primary/10" : "border-primary/50 bg-card/60"}`}>
          <CloudUpload className="h-16 w-16 text-primary" />
          <h2 className="mt-3 text-xl font-semibold">Upload your catalog file</h2>
          <p className="text-sm text-muted-foreground">Drag & drop your file here or <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => inputRef.current?.click()}>click to browse</button></p>
          <Button className="mt-4 px-8" onClick={() => inputRef.current?.click()}>Browse Files</Button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><FileSpreadsheet className="h-4 w-4" />CSV metadata · up to 5 MB · {`${2000}`} rows</div>
          {fileError && <p role="alert" className="mt-4 rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">{fileError}</p>}
          {parsed?.missingColumns.length ? <p role="alert" className="mt-4 rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">Missing required columns: {parsed.missingColumns.join(", ")}</p> : null}
          {parsed && !parsed.missingColumns.length && !parsed.rows.length && <p role="alert" className="mt-4 rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">No valid rows found. {parsed.errors[0]?.message}</p>}
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Your file is read in your browser and only its catalog details are saved to your account.</div>
        </section>
        <aside className="rounded-2xl border border-border bg-card/60 p-5">
          <h3 className="font-semibold">File Requirements</h3>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /><div>Required columns<div className="text-xs text-muted-foreground">{REQUIRED_COLUMNS.join(", ")}</div></div></li>
            <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /><div>Optional columns<div className="text-xs text-muted-foreground">{OPTIONAL_COLUMNS.join(", ")}</div></div></li>
            <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /><div>One row per track<div className="text-xs text-muted-foreground">Rows with the same release title + artist become one release</div></div></li>
            <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /><div>Audio & artwork<div className="text-xs text-muted-foreground">Add them to each draft release in Distribution afterwards</div></div></li>
          </ul>
          <div className="mt-4 flex gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs"><Info className="h-4 w-4 shrink-0 text-primary" />ISRC codes identify recordings. We keep them exactly as provided.</div>
        </aside>
        {file && <section className="rounded-2xl border border-border bg-card/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Upload Progress</h3>{progress < 100 && <Button variant="outline" size="sm" onClick={cancel}><X className="mr-1 h-4 w-4" />Cancel</Button>}</div>
          <div className="mt-3 flex items-center gap-4 rounded-lg border border-border p-3 text-sm">
            <FileSpreadsheet className="h-6 w-6 text-primary" /><span className="min-w-0 flex-1 truncate">{file.name}</span>
            <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-secondary sm:w-56"><div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${progress}%` }} /></div>
            <span className="w-24 text-right">{progress === 100 ? <span className="text-primary">Read</span> : `${progress}%`}</span>
          </div>
        </section>}
      </div>}

      {step === 2 && parsed && stats && <section className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-xl font-semibold">Review & Match</h2><p className="text-sm text-muted-foreground">{parsed.rows.length} valid rows · {parsed.errors.length} rows with problems (will be skipped). Releases already in your catalog and ISRCs you already use are skipped on import.</p></div>
          {parsed.errors.length > 0 && <Button variant="outline" size="sm" onClick={downloadErrors}><Download className="mr-1 h-4 w-4" />Error report</Button>}
        </div>
        {parsed.errors.length > 0 && <ul className="max-h-40 overflow-auto rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">{parsed.errors.slice(0, 50).map((e) => <li key={e.row}>Row {e.row}: {e.message}</li>)}</ul>}
        <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Row</th><th className="p-2">Release</th><th className="p-2">Artist</th><th className="p-2">#</th><th className="p-2">Track</th><th className="p-2">ISRC</th><th className="p-2">UPC</th></tr></thead>
          <tbody>{parsed.rows.slice(0, 200).map((r) => <tr key={r.row} className="border-t border-border"><td className="p-2 text-muted-foreground">{r.row}</td><td className="p-2">{r.release_title}</td><td className="p-2">{r.artist_name}</td><td className="p-2">{r.track_number ?? "—"}</td><td className="p-2">{r.track_title}</td><td className="p-2 font-mono text-xs">{r.isrc ?? <span className="text-muted-foreground">missing</span>}</td><td className="p-2 font-mono text-xs">{r.upc ?? "—"}</td></tr>)}</tbody>
        </table></div>
        <p className="text-xs text-muted-foreground">Imported releases are saved as <strong>Drafts</strong> and are not sent anywhere until you submit them for review in Distribution. To fix a row, correct your file and upload it again.</p>
      </section>}

      {step === 3 && result && <section className="rounded-2xl border border-border bg-card/60 p-6 text-center">
        <CheckCircle2 className={`mx-auto h-12 w-12 ${result.status === "failed" ? "text-destructive" : "text-primary"}`} />
        <h2 className="mt-2 text-2xl font-semibold">{result.status === "completed" ? "Import complete" : result.status === "partial" ? "Imported with some problems" : "Import failed"}</h2>
        <p className="mt-1 text-muted-foreground">{result.releases_imported} releases and {result.tracks_imported} tracks added as drafts · {result.duplicates_skipped} duplicates skipped · {result.error_count} issues</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild><Link to="/distribution">Open drafts in Distribution</Link></Button>
          {result.error_count > 0 && <Button variant="outline" onClick={downloadErrors}><Download className="mr-1 h-4 w-4" />Error report</Button>}
          <Button variant="outline" onClick={() => { setStep(0); setFile(null); setCsv(null); setResult(null); setKey(crypto.randomUUID()); }}>Import another</Button>
        </div>
      </section>}

      {step < 3 && <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        {step < 2 ? <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Continue<ArrowRight className="ml-1 h-4 w-4" /></Button>
          : <Button disabled={run.isPending || !parsed?.rows.length} onClick={() => run.mutate()}>{run.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Import {parsed?.rows.length ?? 0} tracks as drafts</Button>}
      </div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <h3 className="font-semibold">Recent Imports</h3><p className="text-xs text-muted-foreground">The status of your recent catalog imports.</p>
          {imports.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
            : imports.isError ? <p className="mt-4 text-sm text-destructive">Couldn't load imports.</p>
            : !imports.data?.length ? <p className="mt-4 text-sm text-muted-foreground">No imports yet.</p>
            : <div className="mt-3 overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Import name</th><th className="p-2">Distributor</th><th className="p-2">Date</th><th className="p-2">Status</th><th className="p-2">Results</th></tr></thead>
              <tbody>{imports.data.map((r: any) => <tr key={r.id} className="border-t border-border">
                <td className="p-2 font-medium">{r.import_name}</td><td className="p-2">{r.distributor}</td>
                <td className="p-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS[r.status] ?? ""}`}>{r.status}</span></td>
                <td className="p-2 text-xs">{r.tracks_imported} imported<br /><span className="text-muted-foreground">{r.error_count} issues</span></td>
              </tr>)}</tbody></table></div>}
        </section>
        <section className="rounded-2xl border border-border bg-card/60 p-5">
          <h3 className="font-semibold">Catalog Statistics</h3>
          <p className="text-xs text-muted-foreground">{stats ? "From the file you're reviewing" : "Imported to date"}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[[Music2, "Tracks", stats?.tracks ?? totals.tracks], [Disc3, "Releases", stats?.releases ?? totals.releases], [Users, "Artists", stats?.artists ?? totals.artists], [AudioLines, "ISRCs found", stats?.isrcs ?? totals.isrcs]].map(([I, l, v]: any) =>
              <div key={l} className="rounded-xl border border-border bg-background/40 p-3"><I className="h-6 w-6 text-primary" /><div className="mt-1 text-xs text-muted-foreground">{l}</div><div className="text-2xl font-bold">{v}</div></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}
