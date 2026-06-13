export type FurnitureKind = "kallax" | "ivar" | "billy" | "custom";

export type FurniturePreset = {
  key: string;
  label: string;
  kind: FurnitureKind;
  columns: number;
  rows: number;
};

export const FURNITURE_PRESETS: FurniturePreset[] = [
  { key: "kallax_2x2", label: "KALLAX 2×2", kind: "kallax", columns: 2, rows: 2 },
  { key: "kallax_4x4", label: "KALLAX 4×4", kind: "kallax", columns: 4, rows: 4 },
  { key: "kallax_4x2", label: "KALLAX 4×2", kind: "kallax", columns: 4, rows: 2 },
  { key: "kallax_1x4", label: "KALLAX 1×4", kind: "kallax", columns: 1, rows: 4 },
  { key: "ivar", label: "IVAR (3×5)", kind: "ivar", columns: 3, rows: 5 },
  { key: "billy", label: "BILLY (1×6)", kind: "billy", columns: 1, rows: 6 },
];

export const DEFAULT_FURNITURE_COLOR = "#b08968"; // warm wood

/** KALLAX cubes are square; open shelves (IVAR/BILLY/custom) are wide & low. */
export function compartmentAspect(kind: string | null): number {
  return kind === "kallax" ? 1 : 2.4; // width / height
}

export function presetByKey(key: string): FurniturePreset | undefined {
  return FURNITURE_PRESETS.find((p) => p.key === key);
}
