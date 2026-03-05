#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"

const ROOTS = ["app", "components"]
const EXTENSIONS = new Set([".tsx", ".jsx"])
const EXCLUDED_PREFIXES = [path.normalize("components/ui")]
const RAW_CONTROL_PATTERN = /<(button|input|select|textarea)\b/

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolute)))
      continue
    }
    if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute)
    }
  }

  return files
}

function isExcluded(relativePath) {
  const normalized = path.normalize(relativePath)
  return EXCLUDED_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}${path.sep}`))
}

function findViolations(fileContents) {
  const lines = fileContents.split("\n")
  const violations = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!RAW_CONTROL_PATTERN.test(line)) {
      continue
    }
    violations.push({ lineNumber: index + 1, text: line.trim() })
  }

  return violations
}

async function main() {
  const findings = []

  for (const root of ROOTS) {
    const absoluteRoot = path.resolve(process.cwd(), root)
    let files = []
    try {
      files = await collectFiles(absoluteRoot)
    } catch {
      continue
    }

    for (const absoluteFile of files) {
      const relative = path.relative(process.cwd(), absoluteFile)
      if (isExcluded(relative)) {
        continue
      }
      const contents = await fs.readFile(absoluteFile, "utf8")
      const violations = findViolations(contents)
      if (violations.length > 0) {
        findings.push({ relative, violations })
      }
    }
  }

  if (findings.length === 0) {
    console.log("No raw button/input/select/textarea tags found outside allowed paths.")
    return
  }

  console.error("Raw control tags detected outside shadcn primitives:")
  for (const finding of findings) {
    console.error(`- ${finding.relative}`)
    for (const violation of finding.violations) {
      console.error(`  ${violation.lineNumber}: ${violation.text}`)
    }
  }
  process.exitCode = 1
}

void main()
