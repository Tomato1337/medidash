-- CreateEnum
CREATE TYPE "auth"."SharedAccessStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "auth"."shared_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "auth"."SharedAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."shared_access_refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sharedAccessId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_access_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."shared_access_logs" (
    "id" TEXT NOT NULL,
    "sharedAccessId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_access_token_key" ON "auth"."shared_access"("token");

-- CreateIndex
CREATE INDEX "shared_access_userId_idx" ON "auth"."shared_access"("userId");

-- CreateIndex
CREATE INDEX "shared_access_token_idx" ON "auth"."shared_access"("token");

-- CreateIndex
CREATE INDEX "shared_access_status_idx" ON "auth"."shared_access"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shared_access_refresh_tokens_tokenHash_key" ON "auth"."shared_access_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "shared_access_refresh_tokens_sharedAccessId_idx" ON "auth"."shared_access_refresh_tokens"("sharedAccessId");

-- CreateIndex
CREATE INDEX "shared_access_refresh_tokens_expiresAt_idx" ON "auth"."shared_access_refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "shared_access_logs_sharedAccessId_idx" ON "auth"."shared_access_logs"("sharedAccessId");

-- AddForeignKey
ALTER TABLE "auth"."shared_access" ADD CONSTRAINT "shared_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."shared_access_refresh_tokens" ADD CONSTRAINT "shared_access_refresh_tokens_sharedAccessId_fkey" FOREIGN KEY ("sharedAccessId") REFERENCES "auth"."shared_access"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."shared_access_logs" ADD CONSTRAINT "shared_access_logs_sharedAccessId_fkey" FOREIGN KEY ("sharedAccessId") REFERENCES "auth"."shared_access"("id") ON DELETE CASCADE ON UPDATE CASCADE;
