"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmButton } from "@/app/settings/ui";
import {
  deleteFurnitureAction,
  updateFurnitureAction,
} from "../actions";

export function FurnitureEditor({
  id,
  roomId,
  name,
  color,
  columns,
  rows,
}: {
  id: string;
  roomId: string;
  name: string;
  color: string;
  columns: number;
  rows: number;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        size="xs"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        ✏️ Bearbeiten
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border bg-card p-3">
      <form
        action={updateFurnitureAction}
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="roomId" value={roomId} />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input name="name" defaultValue={name} className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Farbe</Label>
          <Input
            name="color"
            type="color"
            defaultValue={color}
            className="h-9 w-14 p-1"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Spalten</Label>
          <Input
            name="columns"
            type="number"
            min={1}
            max={12}
            defaultValue={columns}
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
            defaultValue={rows}
            className="w-20"
          />
        </div>
        <Button type="submit" size="sm">
          Speichern
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Schließen
        </Button>
      </form>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Ändern der Spalten/Reihen baut das Raster neu — Bücher wandern in den
          Stapel.
        </p>
        <ConfirmButton
          action={deleteFurnitureAction}
          id={id}
          extraFields={{ roomId }}
          size="xs"
        />
      </div>
    </div>
  );
}
