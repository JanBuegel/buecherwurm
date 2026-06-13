export type BookStatus = "available" | "reading" | "read" | "lent";

export const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: "available", label: "Verfügbar" },
  { value: "reading", label: "Lese gerade" },
  { value: "read", label: "Gelesen" },
  { value: "lent", label: "Verliehen" },
];

export const CONDITION_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "Neu" },
  { value: "good", label: "Gut" },
  { value: "worn", label: "Abgenutzt" },
];

const STATUS_MAP = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
);
const CONDITION_MAP = Object.fromEntries(
  CONDITION_OPTIONS.map((o) => [o.value, o.label]),
);

export function statusLabel(status: string): string {
  return STATUS_MAP[status] ?? status;
}

/** Soft tinted badge classes per status. */
export const STATUS_TONE: Record<string, string> = {
  available:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  reading: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  read: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  lent: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
};

export function statusTone(status: string): string {
  return (
    STATUS_TONE[status] ?? "bg-muted text-muted-foreground"
  );
}

export function conditionLabel(condition: string | null): string | null {
  if (!condition) return null;
  return CONDITION_MAP[condition] ?? condition;
}

/** Formats integer cents as a German euro string, e.g. 899 -> "8,99 €". */
export function formatPrice(cents: number | null): string | null {
  if (cents == null) return null;
  return `${(cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
