# 📚 Bücherwurm

Selbstgehostetes Tool zur Erfassung des eigenen Bücherbestands — mit
Inhaber-Zuordnung, EAN-/Barcode-Erfassung, automatischem Cover- und
Metadaten-Abruf, Standortverwaltung, Tags, Owner/Viewer-Rollen und (als Kirsche)
einem gerenderten, interaktiven Bücherregal.

> Lokale SQLite-Datenbank, keine Cloud-Abhängigkeit. Läuft auf einem Raspberry Pi
> genauso wie in einem Docker-Container hinter deinem Reverse-Proxy.

## Funktionen

- **Erfassen** — EAN/ISBN eingeben, per Kamera scannen oder per **Titel-/Autor-
  Volltextsuche** (Google Books / Open Library) finden; Metadaten und Cover
  werden automatisch geholt (DNB → Open Library → optional Google Books).
- **Cover** — automatischer Abruf oder eigener Upload; die **Buchrücken-Farbe**
  wird aus der dominanten Cover-Farbe abgeleitet.
- **Verwalten** — Liste mit Volltextsuche, Mehrfach-Tag-Filter, Inhaber-/Raum-/
  Status-Filter, Detail-/Bearbeiten-/Löschen-Ansichten.
- **Batch-Bearbeitung** — mehrere Bücher auswählen und Tags hinzufügen/entfernen
  oder Inhaber/Raum auf einen Schlag ändern.
- **Duplikat-Schutz** — Warnung, bevor ein bereits vorhandenes Buch erneut
  angelegt wird.
- **Bücherregal** — Möbel-Editor (KALLAX/IVAR/BILLY/custom), gerenderte
  Buchrücken mit Titel/Autor, Drag & Drop vom Eingangsstapel ins Fach, sowie
  Tag-Etiketten pro Regalfach.
- **Statistiken** — Übersichts-Kacheln, Top-Autoren/Verlage/Tags, Verteilungen
  (Status/Zustand/Raum/Inhaber), Jahrzehnte, Sprachen, Rekorde und eine
  Zugangs-Timeline.
- **Rollen** — `owner` (Vollzugriff) und `viewer` (nur lesen).
- **Backup** — CSV-Export/-Import in den Einstellungen.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **React 19**
- **Tailwind CSS v4** + **shadcn/ui** + **Base UI**
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

### Erster Login

Der Seed legt einen Owner-Account an. Standardmäßig:

- **E-Mail:** `owner@example.com`
- **Passwort:** `changeme`

Eigene Werte lassen sich vor dem Seed über die Umgebungsvariablen
`SEED_OWNER_EMAIL`, `SEED_OWNER_NAME` und `SEED_OWNER_PASSWORD` setzen
(siehe `.env.example`). **Passwort nach dem ersten Login ändern.**

## Deployment via Docker

```bash
# AUTH_SECRET erzeugen und in .env ablegen (von docker compose gelesen)
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
# optional die öffentliche URL setzen:
echo "AUTH_URL=https://buecher.example.com" >> .env

# Bauen & starten
docker compose up -d --build
```

Der Container läuft dann auf Port **3000**. Beim Start werden automatisch die
**Migrationen** angewendet und der **Seed** (idempotent) eingespielt.

- **Persistenz:** SQLite-DB *und* hochgeladene Cover liegen unter `/app/data`,
  gemountet als Named Volume `buecherwurm-data`. Backup = dieses Volume sichern
  (oder via Einstellungen → Backup als CSV exportieren).
- **Hinter Reverse-Proxy:** `AUTH_URL` auf die öffentliche URL setzen;
  `trustHost` ist bereits aktiv.
- **Google Books (optional):** `GOOGLE_BOOKS_API_KEY` in der `.env` setzen und
  in `docker-compose.yml` einkommentieren.

## Nützliche Scripts

| Script | Zweck |
| --- | --- |
| `npm run dev` | Dev-Server (Turbopack) |
| `npm run build` | Production-Build |
| `npm run db:generate` | Migration aus dem Schema generieren |
| `npm run db:migrate` | Migrationen anwenden |
| `npm run db:seed` | Seed (Owner + Beispielraum) |
| `npm run db:studio` | Drizzle Studio (DB-Browser) |

## Datenmodell (Kurzform)

- **books** — bibliografischer Datensatz (per EAN dedupliziert)
- **copies** — physisches Exemplar (→ book, owner=person, room, compartment, Status, Zustand, Position)
- **persons** — Inhaber (entkoppelt von Konten; optional mit user verknüpft)
- **rooms** — Räume
- **shelves** — Möbel (KALLAX/IVAR/BILLY/custom: roomId, kind, color, columns/rows)
- **compartments** — Fächer eines Möbels (Raster)
- **tags** / **copy_tags** — frei vergebbare Tags (n:m an copies)
- **users** — Login-Konten (Owner / Viewer)
- **loans** — Verleih-Historie

## Mitmachen

Issues und Pull Requests sind willkommen. Vor dem Commit:

```bash
npm run lint
npx tsc --noEmit
```

## Datenschutz

Bücherwurm sammelt keine Telemetrie und ruft nur die konfigurierten
Metadaten-Dienste (DNB, Open Library, optional Google Books) auf, wenn du eine
EAN nachschlägst. Alle Daten bleiben in deiner lokalen SQLite-Datei.

## Lizenz

[MIT](./LICENSE) © 2026 Jan Bügel — frei nutzbar, anpassbar und weiterverteilbar
(auch kommerziell), solange der Copyright-Hinweis erhalten bleibt.
