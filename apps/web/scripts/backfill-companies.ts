/**
 * @file backfill-companies.ts
 * @description One-off backfill that fills in cadastral + QSA data for every
 * `Company` row whose `legalName` is null.
 *
 * These rows were created by transaction sightings (CEAP, contracts, donations)
 * before the OpenCNPJ ingest path was wired in — they have a CNPJ but no
 * razão social, status, or partners. {@link ingestCompany} fetches OpenCNPJ
 * (Redis-cached, then upstream on miss) and upserts the cadastral columns
 * + replaces the partner set.
 *
 * Run from the repo root:
 *   pnpm --filter @imposterio/web exec tsx scripts/backfill-companies.ts
 *
 * Concurrency is capped at 4 in-flight requests — OpenCNPJ does not document
 * a hard rate limit, but lower concurrency keeps us a polite citizen and
 * avoids saturating Upstash REST quotas during the ingest writes.
 */

import { ingestCompany } from "@imposterio/fetchers"
import { prisma } from "@imposterio/db"

const CONCURRENCY = 4

async function main() {
  const missing = await prisma.company.findMany({
    where: { OR: [{ legalName: null }, { legalName: "" }] },
    select: { cnpj: true },
    orderBy: { firstSeenAt: "asc" },
  })

  console.log(`Backfill: ${missing.length} CNPJs to process (concurrency=${CONCURRENCY})`)

  let done = 0
  let ok = 0
  let notFound = 0
  let failed = 0
  const failures: Array<{ cnpj: string; error: string }> = []

  // Worker-pool pattern: each worker pulls the next CNPJ off the shared
  // queue until exhausted. Avoids `Promise.all([...mapped])` which would
  // fire all requests at once.
  const queue = missing.slice()
  async function worker(id: number) {
    while (queue.length > 0) {
      const next = queue.shift()
      if (!next) return
      try {
        const result = await ingestCompany(next.cnpj)
        if (result) {
          ok++
        } else {
          notFound++
        }
      } catch (error) {
        failed++
        failures.push({
          cnpj: next.cnpj,
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        done++
        if (done % 10 === 0 || done === missing.length) {
          console.log(
            `  [${done}/${missing.length}] ok=${ok} notFound=${notFound} failed=${failed}`,
          )
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => worker(i)),
  )

  console.log("\nDone.")
  console.log(`  succeeded: ${ok}`)
  console.log(`  not found (404): ${notFound}`)
  console.log(`  failed: ${failed}`)
  if (failures.length > 0) {
    console.log("\nFailures:")
    for (const f of failures.slice(0, 20)) {
      console.log(`  ${f.cnpj} → ${f.error}`)
    }
    if (failures.length > 20) {
      console.log(`  ... and ${failures.length - 20} more`)
    }
  }

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
