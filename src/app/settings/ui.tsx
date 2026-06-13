"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "./actions";

/** Create form with inline validation error; resets itself on success. */
export function CreateForm({
  action,
  children,
  submitLabel = "Hinzufügen",
  successLabel,
  resetOnSuccess = true,
  className,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel?: string;
  successLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className ?? "flex flex-wrap items-end gap-2"}
    >
      {children}
      <Button type="submit" disabled={pending}>
        {pending ? "…" : submitLabel}
      </Button>
      {state?.error ? (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.ok && (state.message || successLabel) ? (
        <p className="w-full text-sm text-green-600">
          {state.message ?? successLabel}
        </p>
      ) : null}
    </form>
  );
}

/** Two-step confirm button that submits a form action with a hidden field. */
export function ConfirmButton({
  action,
  id,
  fieldName = "id",
  extraFields,
  label = "Löschen",
  size = "sm",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  fieldName?: string;
  extraFields?: Record<string, string>;
  label?: string;
  size?: "sm" | "xs" | "default";
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        size={size}
        variant="destructive"
        type="button"
        onClick={() => setConfirming(true)}
      >
        {label}
      </Button>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name={fieldName} value={id} />
      {extraFields
        ? Object.entries(extraFields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))
        : null}
      <Button size={size} variant="destructive" type="submit">
        Ja
      </Button>
      <Button
        size={size}
        variant="ghost"
        type="button"
        onClick={() => setConfirming(false)}
      >
        Abbrechen
      </Button>
    </form>
  );
}
