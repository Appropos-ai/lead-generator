import { Context, Effect, Layer } from "effect"
import Database from "better-sqlite3"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface DatabaseService {
  readonly run: (sql: string, ...params: unknown[]) => Effect.Effect<Database.RunResult>
  readonly get: <T>(sql: string, ...params: unknown[]) => Effect.Effect<T | undefined>
  readonly all: <T>(sql: string, ...params: unknown[]) => Effect.Effect<T[]>
  readonly transaction: <A>(fn: () => A) => Effect.Effect<A>
}

export const DatabaseService = Context.GenericTag<DatabaseService>("DatabaseService")

export const DatabaseServiceLive = Layer.scoped(
  DatabaseService,
  Effect.map(
    Effect.acquireRelease(
      Effect.sync(() => {
        const dbPath = path.join(__dirname, "..", "..", "data", "leads.db")
        const dir = path.dirname(dbPath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        const db = new Database(dbPath)
        db.pragma("journal_mode = WAL")
        db.pragma("foreign_keys = ON")

        // Bootstrap migration tracking
        db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
          name TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`)

        // Run migrations
        const migrationsDir = path.join(__dirname, "..", "db", "migrations")
        if (fs.existsSync(migrationsDir)) {
          const files = fs.readdirSync(migrationsDir)
            .filter((f) => /^\d{3}_[a-zA-Z0-9_]+\.sql$/.test(f))
            .sort()
          for (const file of files) {
            const applied = db.prepare("SELECT 1 FROM _migrations WHERE name = ?").get(file)
            if (applied) continue
            const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8")
            db.transaction(() => {
              db.exec(sql)
              db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file)
            })()
          }
        }

        return db
      }),
      (db) => Effect.sync(() => db.close())
    ),
    (db): DatabaseService => ({
      run: (sql, ...params) => Effect.sync(() => db.prepare(sql).run(...params)),
      get: <T>(sql: string, ...params: unknown[]) =>
        Effect.sync(() => db.prepare(sql).get(...params) as T | undefined),
      all: <T>(sql: string, ...params: unknown[]) =>
        Effect.sync(() => db.prepare(sql).all(...params) as T[]),
      transaction: <A>(fn: () => A) => Effect.sync(() => db.transaction(fn)()),
    })
  )
)
