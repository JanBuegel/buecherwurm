# 📚 Bücherwurm

Tool zur Erfassung des eigenen Bücherbestands — mit Inhaber-Zuordnung, EAN-Erfassung,
automatischem Cover-/Metadaten-Abruf, Standortverwaltung, Tags, Owner/Viewer-Rollen
und (als Kirsche) einem gerenderten Bücherregal.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **React 19**
- **Tailwind CSS v4** + **shadcn/ui**
- **Drizzle ORM** + **better-sqlite3** (lokale SQLite-Datei)
- **Auth.js v5** (Credentials: E-Mail + Passwort), Rollen `owner` / `viewer`
- Node-Version via **mise** gepinnt (`mise.toml`)

## Setup

```bash
# Node-Version bereitstellen (mise)
mise install

# Abhängigkeiten
npm install

# Env-Datei anlegen und AUTH_SECRET setzen
cp .env.example .env
# AUTH_SECRET generieren: openssl rand -base64 32

# Datenbank migrieren und Seed einspielen
npm run db:migrate
npm run db:seed

# Dev-Server
npm run dev
```

Standard-Owner aus dem Seed: **jab@tickettoaster.de** / Passwort **buecherwurm**
(nach dem ersten Login ändern).

## Nützliche Scripts

| Script | Zweck |
| --- | --- |
| `npm run dev` | Dev-Server (Turbopack) |
| `npm run build` | Production-Build |
| `npm run db:generate` | Migration aus dem Schema generieren |
| `npm run db:migrate` | Migrationen anwenden |
| `npm run db:seed` | Seed (Owner + Beispiel-Regal) |
| `npm run db:studio` | Drizzle Studio (DB-Browser) |

## Datenmodell (Kurzform)

- **books** — bibliografischer Datensatz (per EAN dedupliziert)
- **copies** — physisches Exemplar (→ book, owner=person, room, compartment, Status, Zustand, Position)
- **persons** — Inhaber (entkoppelt von Konten; optional mit user verknüpft)
- **rooms** — Räume
- **shelves** — Möbel (KALLAX/IVAR/…: roomId, kind, color, columns/rows) — Editor folgt in Phase 5
- **compartments** — Fächer eines Möbels (Raster) — UI folgt in Phase 5
- **tags** / **copy_tags** — frei vergebbare Tags (n:m an copies)
- **users** — Login-Konten (Owner / Viewer)
- **loans** — Verleih-Historie

## Roadmap

1. ✅ Fundament (Scaffold, Datenmodell, Auth, Migrationen)
2. ✅ Erfassen (EAN → Metadaten via DNB → Open Library → Google Books optional)
3. ✅ Verwalten (Liste, Suche, Filter, Detail, Bearbeiten, Löschen)
4. ✅ Verwaltung & Backup (Personen, Benutzer, Räume, Tags, Profil, Cover-Upload, CSV Export/Import)
5. ✅ Fancy Bücherregal (Möbel-Editor KALLAX/IVAR/BILLY/custom, gerenderte Buchrücken, Drag & Drop vom Raum-Stapel ins Fach) — `/rooms`
6. Mobile Scan-PWA, Verleih, Statistiken
