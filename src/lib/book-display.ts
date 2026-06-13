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
