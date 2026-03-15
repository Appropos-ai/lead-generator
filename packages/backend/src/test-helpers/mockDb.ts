import { Effect, Layer } from "effect"
import Database from "better-sqlite3"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseService } from "../services/DatabaseService.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, "..", "db", "migrations")

export function createTestDbLayer(): Layer.Layer<DatabaseService> {
  return Layer.succeed(DatabaseService, createTestDb())
}

export function createTestDb(): DatabaseService {
  const db = new Database(":memory:")
  db.pragma("foreign_keys = ON")

  // Run all migration files
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => /^\d{3}_[a-zA-Z0-9_]+\.sql$/.test(f))
      .sort()
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8")
      db.exec(sql)
    }
  }

  return {
    run: (sql, ...params) => Effect.sync(() => db.prepare(sql).run(...params)),
    get: <T>(sql: string, ...params: unknown[]) =>
      Effect.sync(() => db.prepare(sql).get(...params) as T | undefined),
    all: <T>(sql: string, ...params: unknown[]) =>
      Effect.sync(() => db.prepare(sql).all(...params) as T[]),
    transaction: <A>(fn: () => A) => Effect.sync(() => db.transaction(fn)()),
  }
}
