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
  Effect.acquireRelease(
    Effect.sync(() => {
      const dbPath = path.join(__dirname, "..", "..", "data", "leads.db")
      const dir = path.dirname(dbPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const db = new Database(dbPath)
      db.pragma("journal_mode = WAL")
      db.pragma("foreign_keys = ON")

      // Run migrations
      const migrationsDir = path.join(__dirname, "..", "db", "migrations")
      if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir)
          .filter((f) => f.endsWith(".sql"))
          .sort()
        for (const file of files) {
          const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8")
          db.exec(sql)
        }
      }

      const service: DatabaseService = {
        run: (sql, ...params) => Effect.sync(() => db.prepare(sql).run(...params)),
        get: <T>(sql: string, ...params: unknown[]) =>
          Effect.sync(() => db.prepare(sql).get(...params) as T | undefined),
        all: <T>(sql: string, ...params: unknown[]) =>
          Effect.sync(() => db.prepare(sql).all(...params) as T[]),
        transaction: <A>(fn: () => A) => Effect.sync(() => db.transaction(fn)()),
      }
      return service
    }),
    () => Effect.sync(() => { /* db closes on process exit */ })
  )
)
