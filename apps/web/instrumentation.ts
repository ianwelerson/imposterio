/**
 * Next.js instrumentation hook.
 *
 * Importing @prisma/client here ensures the Prisma Query Engine binary
 * is included in Next.js output file tracing for serverless deployments.
 * Without this, the engine binary is not copied to the Vercel bundle
 * because the PrismaClient is instantiated in an external workspace package.
 *
 * @see https://pris.ly/d/engine-not-found-nextjs
 */
import "@prisma/client"

export async function register() {
  // noop — the import side-effect is what matters
}
