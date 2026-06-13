"use client";

import { useActionState, useState } from "react";
import { selectClass } from "@/app/books/form-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_FURNITURE_COLOR, FURNITURE_PRESETS } from "@/lib/furniture";
import {
  createFurnitureAction,
  type FurnitureFormState,
} from "../actions";

export function AddFurnitureForm({ roomId }: { roomId: string }) {
  const [preset, setPreset] = useState(FURNITURE_PRESETS[1].key);
  const [state, formAction, pending] = useActionState<
    FurnitureFormState,
    FormData
  >(createFurnitureAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">＋ Möbel hinzufügen</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="roomId" value={roomId} />

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Vorlage</Label>
            <select
              name="preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className={`${selectClass} w-auto`}
            >
              {FURNITURE_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Eigenes (Raster)</option>
            </select>
          </div>

          {preset === "custom" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Spalten</Label>
                <Input
                  name="columns"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={3}
                  className="w-20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Reihen</Label>
                <Input
                  name="rows"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={3}
                  className="w-20"
                />
              </div>
            </>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Name (optional)
            </Label>
            <Input name="name" placeholder="z. B. Regal links" className="w-44" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Farbe</Label>
            <Input
              name="color"
              type="color"
              defaultValue={DEFAULT_FURNITURE_COLOR}
              className="h-9 w-14 p-1"
            />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "…" : "Hinzufügen"}
          </Button>
          {state?.error ? (
            <p className="w-full text-sm text-destructive">{state.error}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
