import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const repoRoot = process.cwd()
const matrixPath = resolve(repoRoot, "specs/001-build-researchlm-app/visual-coverage-matrix.md")
const contractPath = resolve(repoRoot, "specs/001-build-researchlm-app/contracts/visual-regression-contract.md")

const requiredFR = Array.from({ length: 37 }, (_, idx) => `FR-${String(idx + 1).padStart(3, "0")}`)
const requiredUS = ["US1", "US2", "US3", "US4"]
const requiredVS = Array.from({ length: 12 }, (_, idx) => `VS-${String(idx + 1).padStart(3, "0")}`)

function fail(message) {
  console.error(`visual-coverage validation failed: ${message}`)
  process.exit(1)
}

if (!existsSync(matrixPath)) {
  fail(`missing matrix file at ${matrixPath}`)
}

if (!existsSync(contractPath)) {
  fail(`missing visual contract at ${contractPath}`)
}

const matrixContent = readFileSync(matrixPath, "utf8")
const rows = matrixContent
  .split("\n")
  .filter((line) => line.startsWith("| ") && !line.startsWith("|---") && !line.includes("Coverage ID |"))

if (!rows.length) {
  fail("no matrix rows found")
}

const coverageRows = rows.map((line) => {
  const cols = line
    .split("|")
    .slice(1, -1)
    .map((entry) => entry.trim())

  return {
    id: cols[0] ?? "",
    testId: cols[1] ?? "",
    vsIds: cols[2] ?? "",
    artifact: cols[3] ?? ""
  }
})

for (const row of coverageRows) {
  if (!row.id || !row.testId || !row.vsIds || !row.artifact) {
    fail(`row has empty required column: ${JSON.stringify(row)}`)
  }
}

const presentIds = new Set(coverageRows.map((row) => row.id))

for (const fr of requiredFR) {
  if (!presentIds.has(fr)) {
    fail(`missing ${fr} row in visual coverage matrix`)
  }
}

for (const us of requiredUS) {
  if (!presentIds.has(us)) {
    fail(`missing ${us} row in visual coverage matrix`)
  }
}

const seenVS = new Set()
for (const row of coverageRows) {
  const ids = row.vsIds.split(",").map((part) => part.trim())
  for (const id of ids) {
    if (!id.startsWith("VS-")) {
      continue
    }
    if (!requiredVS.includes(id)) {
      fail(`invalid VS id ${id} in row ${row.id}`)
    }
    seenVS.add(id)
  }
}

for (const vsId of requiredVS) {
  if (!seenVS.has(vsId)) {
    fail(`missing ${vsId} coverage in matrix rows`)
  }
}

console.log("visual-coverage validation passed")
