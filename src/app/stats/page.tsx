import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { conditionLabel, formatPrice, statusLabel } from "@/lib/book-display";
import { requireUser } from "@/lib/auth-helpers";

export const metadata = { title: "Statistiken · Bücherwurm" };

const LANG_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "Englisch",
  fr: "Französisch",
  es: "Spanisch",
  it: "Italienisch",
  nl: "Niederländisch",
};

const STATUS_COLORS: Record<string, string> = {
  available: "#10b981",
  reading: "#0ea5e9",
  read: "#8b5cf6",
  lent: "#f59e0b",
};

// Categorical palette for charts without a fixed colour (owners, …).
const PALETTE = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#a855f7",
];

type Slice = { label: string; value: number; color: string };

// Reading achievements — unlocked as the count / pages-read grows.
const BOOK_TIERS = [
  { n: 1, icon: "🌱", label: "Erstes Buch" },
  { n: 5, icon: "📗", label: "5 gelesen" },
  { n: 10, icon: "📚", label: "10 gelesen" },
  { n: 25, icon: "🤓", label: "25 gelesen" },
  { n: 50, icon: "🏆", label: "50 gelesen" },
  { n: 100, icon: "👑", label: "100 gelesen" },
];
const PAGE_TIERS = [
  { n: 1000, icon: "📄", label: "1.000 Seiten" },
  { n: 5000, icon: "📕", label: "5.000 Seiten" },
  { n: 10000, icon: "🔥", label: "10.000 Seiten" },
  { n: 50000, icon: "🚀", label: "50.000 Seiten" },
];

type Row = { label: string; value: number; color?: string | null };

export default async function StatsPage() {
  await requireUser();

  const copies = await db.query.copies.findMany({
    with: {
      book: true,
      owner: { columns: { name: true } },
      room: { columns: { name: true } },
      copyTags: {
        with: { tag: { columns: { name: true, color: true } } },
      },
    },
  });

  // ---- aggregate ----------------------------------------------------------
  const totalCopies = copies.length;
  const distinctTitles = new Set(copies.map((c) => c.bookId)).size;
  const totalPages = copies.reduce((s, c) => s + (c.book.pageCount ?? 0), 0);
  const totalValueCents = copies.reduce(
    (s, c) => s + (c.purchasePriceCents ?? 0),
    0,
  );

  const authorCounts = new Map<string, number>();
  const publisherCounts = new Map<string, number>();
  const tagCounts = new Map<string, { value: number; color: string | null }>();
  const statusCounts = new Map<string, number>();
  const conditionCounts = new Map<string, number>();
  const roomCounts = new Map<string, number>();
  const ownerCounts = new Map<string, number>();
  const decadeCounts = new Map<number, number>();
  const langCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();

  const bump = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) ?? 0) + 1);

  for (const c of copies) {
    for (const a of c.book.authors ?? []) bump(authorCounts, a.trim());
    if (c.book.publisher) bump(publisherCounts, c.book.publisher.trim());
    for (const ct of c.copyTags) {
      const cur = tagCounts.get(ct.tag.name) ?? {
        value: 0,
        color: ct.tag.color,
      };
      cur.value += 1;
      tagCounts.set(ct.tag.name, cur);
    }
    bump(statusCounts, c.status);
    bump(conditionCounts, c.condition ?? "—");
    bump(roomCounts, c.room?.name ?? "Kein Raum");
    bump(ownerCounts, c.owner.name);
    if (c.book.publishedYear) {
      const dec = Math.floor(c.book.publishedYear / 10) * 10;
      decadeCounts.set(dec, (decadeCounts.get(dec) ?? 0) + 1);
    }
    if (c.book.language) bump(langCounts, c.book.language.toLowerCase());
    if (c.createdAt) {
      const k = `${c.createdAt.getFullYear()}-${String(
        c.createdAt.getMonth() + 1,
      ).padStart(2, "0")}`;
      bump(monthCounts, k);
    }
  }

  const topAuthors = topN(authorCounts);
  const topPublishers = topN(publisherCounts);
  const topTags = [...tagCounts.entries()]
    .map(([label, { value, color }]) => ({ label, value, color }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const statusSlices: Slice[] = ["read", "reading", "available", "lent"]
    .filter((s) => statusCounts.has(s))
    .map((s) => ({
      label: statusLabel(s),
      value: statusCounts.get(s) ?? 0,
      color: STATUS_COLORS[s],
    }));
  const ownerSlices: Slice[] = topN(ownerCounts, 8).map((r, i) => ({
    ...r,
    color: PALETTE[i % PALETTE.length],
  }));
  const conditionRows = topN(conditionCounts, 10).map((r) => ({
    ...r,
    label: r.label === "—" ? "Keine Angabe" : (conditionLabel(r.label) ?? r.label),
  }));
  const roomRows = topN(roomCounts, 12);

  const decadeRows: Row[] = [...decadeCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dec, value]) => ({ label: `${dec}er`, value }));
  const langRows: Row[] = [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, value]) => ({
      label: LANG_LABELS[code] ?? code.toUpperCase(),
      value,
    }));

  // superlatives
  const withPages = copies.filter((c) => c.book.pageCount);
  const longest = maxBy(withPages, (c) => c.book.pageCount ?? 0);
  const withYear = copies.filter((c) => c.book.publishedYear);
  const oldest = minBy(withYear, (c) => c.book.publishedYear ?? Infinity);
  const withPrice = copies.filter((c) => c.purchasePriceCents != null);
  const priciest = maxBy(withPrice, (c) => c.purchasePriceCents ?? 0);
  const avgPages = withPages.length
    ? Math.round(totalPages / withPages.length)
    : 0;
  const avgPriceCents = withPrice.length
    ? Math.round(totalValueCents / withPrice.length)
    : 0;

  // reading / gamification
  const readCopies = copies.filter((c) => c.readAt);
  const readCount = readCopies.length;
  const pagesRead = readCopies.reduce(
    (s, c) => s + (c.book.pageCount ?? 0),
    0,
  );
  const thisYear = new Date().getFullYear();
  const readThisYear = readCopies.filter(
    (c) => c.readAt && c.readAt.getFullYear() === thisYear,
  ).length;
  const readShare = totalCopies
    ? Math.round((readCount / totalCopies) * 100)
    : 0;

  // last 12 months timeline
  const now = new Date();
  const months: Row[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      label: d.toLocaleDateString("de-DE", { month: "short" }),
      value: monthCounts.get(key) ?? 0,
    });
  }

  const num = (n: number) => n.toLocaleString("de-DE");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold">📊 Statistiken</h1>
        <Link
          href="/books"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Zum Bestand
        </Link>
      </div>

      {totalCopies === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Noch keine Bücher erfasst — Statistiken erscheinen, sobald Exemplare
          vorhanden sind.
        </div>
      ) : (
        <>
          {/* ---- KPI cards ---- */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Exemplare" value={num(totalCopies)} />
            <StatCard label="Titel" value={num(distinctTitles)} />
            <StatCard label="Seiten gesamt" value={num(totalPages)} />
            <StatCard
              label="Gesamtwert"
              value={formatPrice(totalValueCents) ?? "—"}
            />
            <StatCard label="Autor:innen" value={num(authorCounts.size)} />
            <StatCard label="Verlage" value={num(publisherCounts.size)} />
            <StatCard label="Tags" value={num(tagCounts.size)} />
            <StatCard
              label="Ø Seiten / Preis"
              value={`${num(avgPages)} · ${formatPrice(avgPriceCents) ?? "—"}`}
            />
          </div>

          {/* ---- reading / gamification ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📖 Lesen</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ReadStat value={num(readCount)} label="gelesen" />
                <ReadStat value={`${readShare}%`} label="vom Bestand" />
                <ReadStat value={num(readThisYear)} label={`${thisYear}`} />
                <ReadStat value={num(pagesRead)} label="Seiten gelesen" />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Erfolge
                </p>
                <div className="flex flex-wrap gap-2">
                  {BOOK_TIERS.map((t) => (
                    <Achievement
                      key={`b${t.n}`}
                      icon={t.icon}
                      label={t.label}
                      unlocked={readCount >= t.n}
                    />
                  ))}
                  {PAGE_TIERS.map((t) => (
                    <Achievement
                      key={`p${t.n}`}
                      icon={t.icon}
                      label={t.label}
                      unlocked={pagesRead >= t.n}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ---- top lists ---- */}
          <div className="grid gap-4 lg:grid-cols-3">
            <BarCard
              title="Top Autor:innen"
              rows={topAuthors}
              empty="Keine Autor:innen erfasst."
            />
            <BarCard
              title="Top Verlage"
              rows={topPublishers}
              empty="Keine Verlage erfasst."
            />
            <BarCard title="Top Tags" rows={topTags} empty="Keine Tags vergeben." />
          </div>

          {/* ---- distributions ---- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <DonutCard title="Status" slices={statusSlices} />
            <DonutCard title="Bücher pro Inhaber:in" slices={ownerSlices} />
            <BarCard title="Zustand" rows={conditionRows} />
            <BarCard title="Bücher pro Raum" rows={roomRows} />
          </div>

          {/* ---- years & languages ---- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <BarCard
              title="Erscheinungsjahrzehnte"
              rows={decadeRows}
              empty="Keine Jahresangaben."
            />
            <BarCard
              title="Sprachen"
              rows={langRows}
              empty="Keine Sprachangaben."
            />
          </div>

          {/* ---- timeline ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Zugänge (letzte 12 Monate)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AreaChart data={months} />
            </CardContent>
          </Card>

          {/* ---- superlatives ---- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rekorde</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Fact
                label="📖 Längstes Buch"
                value={
                  longest
                    ? `${longest.book.title} (${num(longest.book.pageCount ?? 0)} S.)`
                    : "—"
                }
              />
              <Fact
                label="🕰️ Ältestes Buch"
                value={
                  oldest
                    ? `${oldest.book.title} (${oldest.book.publishedYear})`
                    : "—"
                }
              />
              <Fact
                label="💰 Teuerstes Buch"
                value={
                  priciest
                    ? `${priciest.book.title} (${formatPrice(priciest.purchasePriceCents) ?? "—"})`
                    : "—"
                }
              />
              <Fact label="📊 Ø Seiten pro Buch" value={`${num(avgPages)} Seiten`} />
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

/* --------------------------------------------------------------- helpers --- */

function topN(map: Map<string, number>, n = 10): Row[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

function maxBy<T>(items: T[], key: (t: T) => number): T | null {
  let best: T | null = null;
  let bestVal = -Infinity;
  for (const it of items) {
    const v = key(it);
    if (v > bestVal) {
      bestVal = v;
      best = it;
    }
  }
  return best;
}

function minBy<T>(items: T[], key: (t: T) => number): T | null {
  let best: T | null = null;
  let bestVal = Infinity;
  for (const it of items) {
    const v = key(it);
    if (v < bestVal) {
      bestVal = v;
      best = it;
    }
  }
  return best;
}

/* ------------------------------------------------------------ components --- */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div className="truncate text-2xl font-bold tabular-nums" title={value}>
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function BarCard({
  title,
  rows,
  empty = "Keine Daten.",
}: {
  title: string;
  rows: Row[];
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <span
                className="w-28 shrink-0 truncate text-sm"
                title={r.label}
              >
                {r.label}
              </span>
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${(r.value / max) * 100}%`,
                    ...(r.color ? { backgroundColor: r.color } : {}),
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                {r.value}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function DonutCard({ title, slices }: { title: string; slices: Slice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Daten.</p>
        ) : (
          <Donut slices={slices} />
        )}
      </CardContent>
    </Card>
  );
}

function Donut({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  const size = 150;
  const thickness = 24;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-muted"
          />
          {total > 0 &&
            slices.map((d) => {
              const len = (d.value / total) * circ;
              const seg = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-offset}
                >
                  <title>{`${d.label}: ${d.value}`}</title>
                </circle>
              );
              offset += len;
              return seg;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">gesamt</span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        {slices.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: d.color }}
            />
            <span className="truncate" title={d.label}>
              {d.label}
            </span>
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
              {d.value} · {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AreaChart({ data }: { data: Row[] }) {
  const W = 1000;
  const H = 220;
  const pad = 12;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const x = (i: number) => ((i + 0.5) / n) * W;
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${x(0)},${H} ${line} ${x(n - 1)},${H}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-44 w-full text-primary"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#areaGrad)" />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex">
        {data.map((m, i) => (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="flex-1 text-center text-[10px] tabular-nums text-muted-foreground"
            title={`${m.label}: ${m.value}`}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReadStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Achievement({
  icon,
  label,
  unlocked,
}: {
  icon: string;
  label: string;
  unlocked: boolean;
}) {
  return (
    <span
      title={unlocked ? label : `Gesperrt: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${
        unlocked
          ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
          : "border-dashed text-muted-foreground opacity-60"
      }`}
    >
      <span aria-hidden>{unlocked ? icon : "🔒"}</span>
      {label}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm" title={value}>
        {value}
      </div>
    </div>
  );
}
