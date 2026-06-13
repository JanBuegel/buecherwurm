"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteCopyAction } from "../actions";

export function DeleteCopyButton({ copyId }: { copyId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setConfirming(true)}
      >
        Löschen
      </Button>
    );
  }

  return (
    <form action={deleteCopyAction} className="flex items-center gap-2">
      <input type="hidden" name="copyId" value={copyId} />
      <span className="text-sm text-muted-foreground">Wirklich löschen?</span>
      <Button size="sm" variant="destructive" type="submit">
        Ja, löschen
      </Button>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        onClick={() => setConfirming(false)}
      >
        Abbrechen
      </Button>
    </form>
  );
}
