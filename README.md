# Lead Generator

Local lead management app with pipeline tracking, outreach logging, and plugin-based lead scraping.

## Tech Stack

- **Monorepo** — pnpm workspaces (`shared`, `backend`, `frontend`)
- **Backend** — TypeScript, Effect.ts, Node HTTP server, SQLite (better-sqlite3)
- **Frontend** — React 19, Vite, TanStack Query, Tailwind CSS

## Prerequisites

- Node 23 (see `.nvmrc`)
- pnpm

## Getting Started

```sh
pnpm install
pnpm dev
```

This starts the backend on `http://localhost:3001` and the frontend on `http://localhost:5173`.

The SQLite database is auto-created at `packages/backend/data/leads.db` on first run.

## Scripts

| Command          | Description                                  |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Start backend + frontend in dev mode         |
| `pnpm build`     | Build all packages (shared first)            |
| `pnpm test`      | Run all tests                                |
| `pnpm test:watch`| Run tests in watch mode                      |
| `pnpm lint`      | Lint all packages                            |
| `pnpm lint:fix`  | Lint and auto-fix                            |
| `pnpm typecheck` | Type-check all packages                      |
| `pnpm format`    | Format code with Prettier                    |
| `pnpm clean`     | Remove `dist` and `node_modules` everywhere  |

## Project Structure

```
packages/
  shared/       Shared Effect Schema definitions (Lead, Outreach, Plugin)
  backend/
    src/
      routes/       HTTP route handlers
      services/     DatabaseService, LeadService, OutreachService, PluginService
      server.ts     HTTP router with CORS
    plugins/        Drop-in plugin directory
  frontend/
    src/
      pages/        LeadsPage, LeadDetailPage, PluginsPage
      hooks/        React Query hooks
      api/          API client
```

## Plugin System

Plugins live in `packages/backend/plugins/<name>/index.ts`. Each plugin exports a `manifest` object and a `scrape()` function:

```ts
import type { ScrapedLead } from "@lead-generator/shared"

export const manifest = {
  name: "my-plugin",
  description: "Scrapes leads from some source",
  version: "1.0.0",
}

export async function scrape(): Promise<ScrapedLead[]> {
  return [
    {
      name: "Jane Doe",
      email: "jane@example.com",       // required
      company: "Acme Corp",            // optional
      title: "VP of Sales",            // optional
      linkedin_url: "https://...",     // optional
      notes: "Met at conference",      // optional
    },
  ]
}
```

Plugins are auto-discovered on startup. Duplicate leads (matching email) are silently skipped.

## API Overview

### Leads

| Method   | Endpoint                    | Description                          |
| -------- | --------------------------- | ------------------------------------ |
| `GET`    | `/api/leads`                | List leads (query: `stage`, `page`, `limit`) |
| `GET`    | `/api/leads/:id`            | Get a lead by ID                     |
| `POST`   | `/api/leads`                | Create a lead                        |
| `PATCH`  | `/api/leads/:id`            | Update a lead                        |
| `DELETE` | `/api/leads/:id`            | Delete a lead                        |
| `PATCH`  | `/api/leads/bulk/stage`     | Bulk update pipeline stage           |
| `POST`   | `/api/leads/bulk/delete`    | Bulk delete leads                    |

### Outreach

| Method   | Endpoint                    | Description                          |
| -------- | --------------------------- | ------------------------------------ |
| `GET`    | `/api/outreach`             | List outreach for a lead (query: `lead_id`) |
| `POST`   | `/api/outreach`             | Log an outreach entry                |
| `DELETE` | `/api/outreach/:id`         | Delete an outreach entry             |

### Plugins

| Method   | Endpoint                    | Description                          |
| -------- | --------------------------- | ------------------------------------ |
| `GET`    | `/api/plugins`              | List available plugins               |
| `POST`   | `/api/plugins/:name/run`    | Run a plugin to scrape leads         |
| `GET`    | `/api/plugins/runs`         | List plugin run history              |
