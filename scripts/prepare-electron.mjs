import { access, cp, mkdir, rm } from "node:fs/promises"
import { constants } from "node:fs"
import path from "node:path"

async function exists(targetPath) {
  try {
    await access(targetPath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function assertExists(targetPath, helpText) {
  if (!(await exists(targetPath))) {
    throw new Error(`${helpText}: ${targetPath}`)
  }
}

async function main() {
  const rootDir = process.cwd()
  const nextStandaloneDir = path.join(rootDir, ".next", "standalone")
  const nextStaticDir = path.join(rootDir, ".next", "static")
  const publicDir = path.join(rootDir, "public")
  const outDir = path.join(rootDir, "dist", "standalone")

  await assertExists(nextStandaloneDir, "Missing Next standalone output. Run npm run build:desktop:web first")
  await assertExists(nextStaticDir, "Missing Next static assets. Run npm run build:desktop:web first")

  await rm(path.join(rootDir, "dist"), { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  await cp(nextStandaloneDir, outDir, { recursive: true })
  await mkdir(path.join(outDir, ".next"), { recursive: true })
  await cp(nextStaticDir, path.join(outDir, ".next", "static"), { recursive: true })

  if (await exists(publicDir)) {
    await cp(publicDir, path.join(outDir, "public"), { recursive: true })
  }

  process.stdout.write(`Prepared desktop bundle at ${outDir}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
