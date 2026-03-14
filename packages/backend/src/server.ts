import * as http from "node:http"
import { Effect } from "effect"

type RouteHandler = (req: http.IncomingMessage, params: Record<string, string>, body: unknown) => Effect.Effect<unknown, unknown>

interface Route {
  method: string
  pattern: RegExp
  paramNames: string[]
  handler: RouteHandler
}

const routes: Route[] = []

function pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = []
  const regexStr = path.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name)
    return "([^/]+)"
  })
  return { pattern: new RegExp(`^${regexStr}$`), paramNames }
}

export function route(method: string, path: string, handler: RouteHandler) {
  const { pattern, paramNames } = pathToRegex(path)
  routes.push({ method: method.toUpperCase(), pattern, paramNames, handler })
}

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk) => chunks.push(chunk))
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString()
      if (!raw) return resolve(undefined)
      try { resolve(JSON.parse(raw)) } catch { resolve(undefined) }
    })
  })
}

function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf("?")
  if (idx === -1) return {}
  const params: Record<string, string> = {}
  new URLSearchParams(url.slice(idx + 1)).forEach((v, k) => { params[k] = v })
  return params
}

export function createServer(port: number): Effect.Effect<http.Server> {
  return Effect.async<http.Server>((resume) => {
    const server = http.createServer(async (req, res) => {
      // CORS
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")

      if (req.method === "OPTIONS") {
        res.writeHead(204)
        res.end()
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
        r.paramNames.forEach((name, i) => { params[name] = match[i + 1] })

        const body = await parseBody(req)

        const result = await Effect.runPromise(
          r.handler(req, params, body).pipe(
            Effect.map((data) => {
              res.writeHead(200, { "Content-Type": "application/json" })
              res.end(JSON.stringify(data))
            }),
            Effect.catchAll((err: any) => {
              const status = err?.status ?? 500
              const message = err?.message ?? "Internal server error"
              res.writeHead(status, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ error: message }))
              return Effect.void
            })
          )
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
