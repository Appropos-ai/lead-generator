import { Context, Duration, Effect, Layer } from "effect"
import type { PluginMetadata, PluginRun, ScrapedLead } from "@lead-generator/shared"
import { DatabaseService } from "./DatabaseService.js"
import { LeadService } from "./LeadService.js"
import { PluginNotFoundError, PluginExecutionError, PluginDiscoveryError } from "../errors/index.js"
import { DuplicateLeadError } from "../errors/index.js"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface PluginModule {
  manifest: PluginMetadata
  scrape: (config?: Record<string, unknown>) => Promise<ScrapedLead[]>
}

export interface PluginService {
  readonly list: () => Effect.Effect<PluginMetadata[], PluginDiscoveryError>
  readonly run: (name: string) => Effect.Effect<PluginRun, PluginNotFoundError | PluginExecutionError>
  readonly listRuns: () => Effect.Effect<PluginRun[]>
}

export const PluginService = Context.GenericTag<PluginService>("PluginService")

const PLUGINS_DIR = path.join(__dirname, "..", "..", "plugins")
export const PLUGIN_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/

export function sanitizeError(msg: string): string {
  return msg
    .replace(/[A-Z_]{2,}=[^\s]+/g, "[REDACTED]")
    .slice(0, 500)
}

export function isValidPluginName(name: string): boolean {
  if (!PLUGIN_NAME_RE.test(name)) return false
  const resolved = path.resolve(PLUGINS_DIR, name)
  if (!resolved.startsWith(PLUGINS_DIR + path.sep)) return false
  try {
    const real = fs.realpathSync(resolved)
    return real.startsWith(fs.realpathSync(PLUGINS_DIR) + path.sep)
  } catch {
    return false
  }
}

async function loadPlugin(name: string): Promise<PluginModule | undefined> {
  if (!isValidPluginName(name)) return undefined

  const pluginPath = path.join(PLUGINS_DIR, name, "index.ts")
  const pluginPathJs = path.join(PLUGINS_DIR, name, "index.js")
  const realPluginsDir = fs.realpathSync(PLUGINS_DIR)

  for (const p of [pluginPath, pluginPathJs]) {
    if (fs.existsSync(p)) {
      const realPath = fs.realpathSync(p)
      if (!realPath.startsWith(realPluginsDir + path.sep)) return undefined
      const mod = await import(pathToFileURL(realPath).href)
      return mod.default ?? mod
    }
  }
  return undefined
}

function discoverPlugins(): string[] {
  if (!fs.existsSync(PLUGINS_DIR)) return []
  return fs.readdirSync(PLUGINS_DIR)
    .filter((f) => {
      if (!isValidPluginName(f)) return false
      const dir = path.join(PLUGINS_DIR, f)
      return fs.statSync(dir).isDirectory() &&
        (fs.existsSync(path.join(dir, "index.ts")) || fs.existsSync(path.join(dir, "index.js")))
    })
}

export const PluginServiceLive = Layer.effect(
  PluginService,
  Effect.all([DatabaseService, LeadService]).pipe(
    Effect.map(([db, leads]): PluginService => ({
      list: () =>
        Effect.tryPromise({
          try: async () => {
            const names = discoverPlugins()
            const plugins: PluginMetadata[] = []
            for (const name of names) {
              const mod = await loadPlugin(name)
              if (mod) plugins.push(mod.manifest)
            }
            return plugins
          },
          catch: (err) => new PluginDiscoveryError({ message: err instanceof Error ? err.message : String(err) }),
        }),

      run: (name) =>
        Effect.gen(function* () {
          const mod = yield* Effect.tryPromise({
            try: () => loadPlugin(name),
            catch: () => new PluginNotFoundError({ message: `Plugin ${name} not found` }),
          })

          if (!mod) {
            return yield* Effect.fail(new PluginNotFoundError({ message: `Plugin ${name} not found` }))
          }

          // Record the run
          const runResult = yield* db.run(
            "INSERT INTO plugin_runs (plugin_name) VALUES (?)",
            name
          )
          const runId = runResult.lastInsertRowid

          const scrapeAndInsert: Effect.Effect<PluginRun, PluginExecutionError> = Effect.gen(function* () {
            const scraped = yield* Effect.tryPromise({
              try: () => mod.scrape(),
              catch: (err) => new PluginExecutionError({ message: sanitizeError(err instanceof Error ? err.message : String(err)) }),
            }).pipe(
              Effect.timeout(Duration.seconds(30)),
              Effect.catchTag("TimeoutException", () =>
                Effect.fail(new PluginExecutionError({ message: `Plugin ${name} timed out after 30s` }))
              ),
            )
            let added = 0
            for (const s of scraped) {
              const createResult = yield* Effect.either(
                leads.create({
                  name: s.name,
                  email: s.email,
                  linkedin_url: s.linkedin_url ?? null,
                  company: s.company ?? null,
                  title: s.title ?? null,
                  source: name,
                  notes: s.notes ?? null,
                })
              )
              if (createResult._tag === "Right") added++
              // Silently skip duplicates
            }

            yield* db.run(
              `UPDATE plugin_runs SET status = 'completed', completed_at = datetime('now'),
               leads_found = ?, leads_added = ? WHERE id = ?`,
              scraped.length, added, runId
            )

            const run = yield* db.get<PluginRun>("SELECT * FROM plugin_runs WHERE id = ?", runId)
            if (!run) return yield* Effect.die(new Error("Plugin run not found after insert"))
            return run
          })

          const result = yield* Effect.either(scrapeAndInsert)

          if (result._tag === "Left") {
            const message = sanitizeError(result.left.message)
            yield* db.run(
              `UPDATE plugin_runs SET status = 'failed', completed_at = datetime('now'),
               error_message = ? WHERE id = ?`,
              message, runId
            )
            return yield* Effect.fail(new PluginExecutionError({ message }))
          }
          return result.right
        }),

      listRuns: () =>
        db.all<PluginRun>("SELECT * FROM plugin_runs ORDER BY started_at DESC"),
    }))
  )
)
