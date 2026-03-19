/**
 * @file index.ts
 * @description Public API for the database package.
 *
 * Exports a singleton PrismaClient instance and typed query functions
 * for the game and QSA modules.
 */

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

/**
 * Singleton PrismaClient instance.
 *
 * In development, the client is stored on `globalThis` to survive
 * Next.js hot reloads without creating multiple database connections.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export * from "@prisma/client"
