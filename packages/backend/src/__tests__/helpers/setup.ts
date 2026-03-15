import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import Database from "better-sqlite3"
import { Effect, Layer } from "effect"
import { DatabaseService } from "../../services/DatabaseService.js"
import { LeadService, LeadServiceLive } from "../../services/LeadService.js"
import { OutreachService, OutreachServiceLive } from "../../services/OutreachService.js"
import { PluginService, PluginServiceLive } from "../../services/PluginService.js"
import { registerLeadRoutes } from "../../routes/leads.js"
import { registerOutreachRoutes } from "../../routes/outreach.js"
import { registerPluginRoutes } from "../../routes/plugins.js"
import { createServer, resetRoutes } from "../../server.js"
import { _resetForTest as resetRateLimiter } from "../../utils/rateLimiter.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, "..", "..", "db", "migrations")

function createInMemoryDb(): Database.Database {
  const db = new Database(":memory:")
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")

  // Bootstrap migration tracking
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)

  // Run real migration files
  if (fs.existsSync(migrationsDir)) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => /^\d{3}_[a-zA-Z0-9_]+\.sql$/.test(f))
      .sort()
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8")
      db.transaction(() => {
        db.exec(sql)
        db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file)
      })()
    }
  }

  return db
}

export interface TestServer {
  baseUrl: string
  close: () => Promise<void>
}

export async function createTestServer(): Promise<TestServer> {
  // Reset global state
  resetRoutes()
  resetRateLimiter()

  const db = createInMemoryDb()

  // Build a DatabaseService layer backed by the in-memory DB
  const dbService: DatabaseService = {
    run: (sql, ...params) => Effect.sync(() => db.prepare(sql).run(...params)),
    get: <T>(sql: string, ...params: unknown[]) => Effect.sync(() => db.prepare(sql).get(...params) as T | undefined),
    all: <T>(sql: string, ...params: unknown[]) => Effect.sync(() => db.prepare(sql).all(...params) as T[]),
    transaction: <A>(fn: () => A) => Effect.sync(() => db.transaction(fn)()),
  }

  const DbLayer = Layer.succeed(DatabaseService, dbService)
  const LeadLayer = LeadServiceLive.pipe(Layer.provide(DbLayer))
  const OutreachLayer = OutreachServiceLive.pipe(Layer.provide(DbLayer))
  const PluginLayer = PluginServiceLive.pipe(Layer.provide(Layer.merge(LeadLayer, DbLayer)))
  const AppLayer = Layer.mergeAll(LeadLayer, OutreachLayer, PluginLayer)

  // Build services and register routes
  const program = Effect.gen(function* () {
    const leadService = yield* LeadService
    const outreachService = yield* OutreachService
    const pluginService = yield* PluginService

    registerLeadRoutes(leadService)
    registerOutreachRoutes(outreachService)
    registerPluginRoutes(pluginService)
  })

  await Effect.runPromise(program.pipe(Effect.provide(AppLayer)))

  // Start on port 0 (OS assigns a random port)
  const server = await Effect.runPromise(createServer(0))
  const addr = server.address() as { port: number }

  return {
    baseUrl: `http://localhost:${addr.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        db.close()
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  }
}
