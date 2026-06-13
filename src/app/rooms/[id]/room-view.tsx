"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { spineWidthPx } from "@/lib/spine";
import { placeCopyAction } from "../actions";
import { Spine, type SpineCopy } from "../spine";
import { AddFurnitureForm } from "./add-furniture-form";
import { FurnitureEditor } from "./furniture-editor";

type Comp = { id: string; row: number; col: number };
type Furniture = {
  id: string;
  name: string;
  kind: string | null;
  color: string | null;
  columns: number;
  rows: number;
  compartments: Comp[];
};
type Copy = SpineCopy & { compartmentId: string | null };

export function RoomView({
  room,
  furniture,
  copies,
  isOwner,
}: {
  room: { id: string; name: string };
  furniture: Furniture[];
  copies: Copy[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticCopies, applyMove] = useOptimistic(
    copies,
    (state: Copy[], move: { copyId: string; compartmentId: string | null }) =>
      state.map((c) =>
        c.id === move.copyId ? { ...c, compartmentId: move.compartmentId } : c,
      ),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const draggedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const byCompartment = (compartmentId: string | null) =>
    optimisticCopies.filter((c) => c.compartmentId === compartmentId);
  const stack = byCompartment(null);
  const activeCopy = optimisticCopies.find((c) => c.id === activeId) ?? null;

  function openCopy(id: string) {
    if (draggedRef.current) return; // suppress click right after a drag
    // Remember the room so the detail page can offer "back to the shelf".
    router.push(`/books/${id}?from=${encodeURIComponent(`/rooms/${room.id}`)}`);
  }

  function onDragStart(e: DragStartEvent) {
    draggedRef.current = false;
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over) return;
    draggedRef.current = true;
    setTimeout(() => (draggedRef.current = false), 300);

    const copyId = String(e.active.id);
    const target = over === "stack" ? null : over.replace(/^comp:/, "");
    const current = optimisticCopies.find((c) => c.id === copyId);
    if (current && current.compartmentId === target) return;

    startTransition(async () => {
      applyMove({ copyId, compartmentId: target });
      await placeCopyAction(copyId, target, room.id);
    });
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-sm text-muted-foreground">
            {furniture.length} Möbel · {stack.length} im Stapel
          </p>
        </div>
        <Link
          href="/rooms"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Räume
        </Link>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex flex-col gap-8">
          {furniture.map((f) => (
            <FurniturePiece
              key={f.id}
              furniture={f}
              copiesByCompartment={byCompartment}
              roomId={room.id}
              isOwner={isOwner}
              draggable={isOwner}
              onOpen={openCopy}
            />
          ))}
          {furniture.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Noch keine Möbel in diesem Raum.
              {isOwner ? " Füge unten ein Möbelstück hinzu." : ""}
            </p>
          ) : null}
        </div>

        <Stack
          copies={stack}
          draggable={isOwner}
          onOpen={openCopy}
        />

        <DragOverlay>
          {activeCopy ? (
            <div className="h-28" style={{ width: spineWidthPx(activeCopy.pageCount) }}>
              <Spine copy={activeCopy} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isOwner ? <AddFurnitureForm roomId={room.id} /> : null}
    </main>
  );
}

/* ----------------------------------------------------------- furniture --- */

function FurniturePiece({
  furniture: f,
  copiesByCompartment,
  roomId,
  isOwner,
  draggable,
  onOpen,
}: {
  furniture: Furniture;
  copiesByCompartment: (id: string | null) => Copy[];
  roomId: string;
  isOwner: boolean;
  draggable: boolean;
  onOpen: (id: string) => void;
}) {
  const color = f.color ?? "#b08968";
  const cellH = f.kind === "kallax" ? 132 : 104;
  // Compartments fill the available width (min per column so they stay roomy);
  // many books then shrink to fit inside each compartment.
  const minCol = f.kind === "kallax" ? 150 : 210;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{f.name}</h2>
        {isOwner ? (
          <FurnitureEditor
            id={f.id}
            roomId={roomId}
            name={f.name}
            color={color}
            columns={f.columns}
            rows={f.rows}
          />
        ) : null}
      </div>

      {/* horizontal scroll keeps wide furniture usable on small screens */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          className="w-fit min-w-full rounded-lg p-2.5 shadow-xl ring-1 ring-black/20"
          style={{
            backgroundColor: color,
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,.14), rgba(0,0,0,.20)), repeating-linear-gradient(90deg, rgba(0,0,0,.05) 0 7px, rgba(255,255,255,.04) 7px 14px)",
          }}
        >
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${f.columns}, minmax(${minCol}px, 1fr))`,
            }}
          >
            {f.compartments.map((c) => (
              <Compartment key={c.id} compartmentId={c.id} height={cellH}>
                {copiesByCompartment(c.id).map((copy) => (
                  <DraggableSpine
                    key={copy.id}
                    copy={copy}
                    enabled={draggable}
                    onOpen={onOpen}
                  />
                ))}
              </Compartment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Compartment({
  compartmentId,
  height,
  children,
}: {
  compartmentId: string;
  height: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `comp:${compartmentId}` });
  return (
    <div
      ref={setNodeRef}
      style={{ height }}
      className={`relative overflow-hidden rounded-sm bg-black/25 shadow-[inset_0_2px_7px_rgba(0,0,0,.5)] ${
        isOver ? "ring-2 ring-inset ring-amber-300" : ""
      }`}
    >
      <div className="flex h-full items-end gap-[2px] overflow-x-auto px-1 pt-2 pb-[3px]">
        {children}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-black/40" />
    </div>
  );
}

/* --------------------------------------------------------------- stack --- */

function Stack({
  copies,
  draggable,
  onOpen,
}: {
  copies: Copy[];
  draggable: boolean;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "stack" });
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        📚 Eingangsstapel ({copies.length})
      </h2>
      <div
        ref={setNodeRef}
        className={`flex min-h-28 flex-wrap items-end gap-[3px] rounded-lg border-2 border-dashed bg-muted/30 p-3 ${
          isOver ? "border-amber-400 bg-amber-50" : ""
        }`}
      >
        {copies.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Leer — alle Bücher eingeräumt. 🎉
          </span>
        ) : (
          copies.map((copy) => (
            <DraggableSpine
              key={copy.id}
              copy={copy}
              enabled={draggable}
              onOpen={onOpen}
              height={96}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- draggable --- */

function DraggableSpine({
  copy,
  enabled,
  onOpen,
  height,
}: {
  copy: Copy;
  enabled: boolean;
  onOpen: (id: string) => void;
  height?: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: copy.id,
    disabled: !enabled,
  });
  return (
    <div
      ref={setNodeRef}
      {...(enabled ? listeners : {})}
      {...attributes}
      onClick={() => onOpen(copy.id)}
      style={{
        // Natural width when there's room; shrinks toward a readable minimum
        // as a compartment fills up. Beyond that the compartment scrolls.
        flexBasis: spineWidthPx(copy.pageCount),
        flexGrow: 0,
        flexShrink: 1,
        minWidth: 14,
        height,
        touchAction: "none",
      }}
      className={height ? undefined : "h-full"}
    >
      <Spine copy={copy} dragging={isDragging} />
    </div>
  );
}
