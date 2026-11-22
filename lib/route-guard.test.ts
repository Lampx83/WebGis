// Guard-rail: middleware cannot see revocation, so every API handler that is not public must call
// authorize() (lib/authz.ts). This fails when someone adds a privileged route and forgets it.
import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { ruleFor } from "./access-policy"

const API_DIR = path.resolve(__dirname, "../app/api")
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? routeFiles(p) : e.name === "route.ts" ? [p] : []
  })
}

/** "/…/app/api/devices/[id]/route.ts" -> "/api/devices/1" */
function urlPath(file: string): string {
  const rel = path.relative(path.resolve(__dirname, "../app"), path.dirname(file))
  return "/" + rel.split(path.sep).join("/").replace(/\[[^\]]+\]/g, "1")
}

describe("API route handlers", () => {
  for (const file of routeFiles(API_DIR)) {
    const src = fs.readFileSync(file, "utf8")
    const url = urlPath(file)
    for (const method of METHODS) {
      const start = src.search(new RegExp(`export\\s+async\\s+function\\s+${method}\\b`))
      if (start < 0) continue
      const rest = src.slice(start + 1)
      const next = rest.search(/export\s+async\s+function\s/)
      const body = next < 0 ? rest : rest.slice(0, next)
      const rule = ruleFor(url, method)
      // /api/auth/* are public in the policy and verify the session themselves.
      if (rule.kind === "public") continue
      it(`${method} ${url} calls authorize()`, () => {
        expect(body).toMatch(/await authorize\(request\)/)
      })
    }
  }
})
