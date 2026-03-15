import * as http from "node:http"
import { Effect, ParseResult } from "effect"
import { isRateLimited } from "./utils/rateLimiter.js"

const MAX_BODY_SIZE = 1_048_576 // 1 MB
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173"

type RouteHandler = (
  req: http.IncomingMessage,
  params: Record<string, string>,
  body: unknown,
) => Effect.Effect<unknown, unknown>

interface Route {
  method: string
  pattern: RegExp
  paramNames: string[]
  handler: RouteHandler
  options?: { status?: number }
}

const routes: Route[] = []

// Mutates shared module state — test isolation requires pool: "forks" (process-per-file) in vitest config.
export function resetRoutes() {
  routes.length = 0
}

function pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = []
  const regexStr = path.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name)
    return "([^/]+)"
  })
  return { pattern: new RegExp(`^${regexStr}$`), paramNames }
}

export function route(method: string, path: string, handler: RouteHandler, options?: { status?: number }) {
  const { pattern, paramNames } = pathToRegex(path)
  routes.push({ method: method.toUpperCase(), pattern, paramNames, handler, options })
}

class BodyTooLargeError extends Error {
  constructor() {
    super("Request body too large")
  }
}

class MalformedJsonError extends Error {
  constructor() {
    super("Malformed JSON body")
  }
}

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_SIZE) {
        req.destroy()
        reject(new BodyTooLargeError())
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString()
      if (!raw) return resolve(undefined)
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new MalformedJsonError())
      }
    })
    req.on("error", (err) => reject(err))
  })
}

function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf("?")
  if (idx === -1) return {}
  const params: Record<string, string> = {}
  new URLSearchParams(url.slice(idx + 1)).forEach((v, k) => {
    params[k] = v
  })
  return params
}

export function createServer(port: number): Effect.Effect<http.Server> {
  return Effect.async<http.Server>((resume) => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const server = http.createServer(async (req, res) => {
      // CORS
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")
      // Security headers
      res.setHeader("X-Content-Type-Options", "nosniff")
      res.setHeader("X-Frame-Options", "DENY")
      res.setHeader("X-XSS-Protection", "0")

      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
        return
      }

      // Rate limiting
      const ip = req.socket.remoteAddress ?? "unknown"
      if (isRateLimited(ip)) {
        res.writeHead(429, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Too many requests" }))
        return
      }

      const url = req.url ?? "/"
      const pathname = url.split("?")[0]
      const method = req.method?.toUpperCase() ?? "GET"
      const query = parseQuery(url)

      for (const r of routes) {
        if (r.method !== method) continue
        const match = pathname.match(r.pattern)
        if (!match) continue

        const params: Record<string, string> = { ...query }
        r.paramNames.forEach((name, i) => {
          params[name] = match[i + 1]
        })

        let body: unknown
        // Content-Type validation for requests with bodies
        if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
          const contentType = req.headers["content-type"]
          const contentLength = req.headers["content-length"]
          if (contentLength && contentLength !== "0" && contentType && !contentType.includes("application/json")) {
            res.writeHead(415, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: "Unsupported Media Type: expected application/json" }))
            return
          }
        }

        try {
          body = await parseBody(req)
        } catch (err) {
          if (err instanceof BodyTooLargeError) {
            res.writeHead(413, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: "Request body too large" }))
            return
          }
          if (err instanceof MalformedJsonError) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: "Malformed JSON body" }))
            return
          }
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Bad request" }))
          return
        }

        await Effect.runPromise(
          r.handler(req, params, body).pipe(
            Effect.map((data) => {
              if (data === undefined || data === null) {
                res.writeHead(204)
                res.end()
              } else {
                const status = r.options?.status ?? (r.method === "POST" ? 201 : 200)
                res.writeHead(status, { "Content-Type": "application/json" })
                res.end(JSON.stringify(data))
              }
            }),
            Effect.catchAll((err: unknown) => {
              if (ParseResult.isParseError(err)) {
                const message = ParseResult.TreeFormatter.formatErrorSync(err)
                res.writeHead(400, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ error: message }))
                return Effect.void
              }

              const status =
                typeof err === "object" &&
                err !== null &&
                "status" in err &&
                typeof (err as Record<string, unknown>).status === "number"
                  ? ((err as Record<string, unknown>).status as number)
                  : 500
              const message =
                typeof err === "object" &&
                err !== null &&
                "message" in err &&
                typeof (err as Record<string, unknown>).message === "string"
                  ? ((err as Record<string, unknown>).message as string)
                  : "Internal server error"

              if (status >= 500) {
                console.error("Internal error:", message)
                res.writeHead(status, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ error: "Internal server error" }))
              } else {
                res.writeHead(status, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ error: message }))
              }
              return Effect.void
            }),
          ),
        )
        return
      }

      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Not found" }))
    })

    server.listen(port, () => {
      console.log(`Backend server running on http://localhost:${port}`)
      resume(Effect.succeed(server))
    })
  })
}
