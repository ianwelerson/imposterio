-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "game_cards" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "refMeta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_votes" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "fair" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_cards_type_idx" ON "game_cards"("type");

-- CreateIndex
CREATE INDEX "game_cards_module_idx" ON "game_cards"("module");

-- CreateIndex
CREATE UNIQUE INDEX "game_cards_type_module_refId_key" ON "game_cards"("type", "module", "refId");

-- AddForeignKey
ALTER TABLE "game_votes" ADD CONSTRAINT "game_votes_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "game_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

