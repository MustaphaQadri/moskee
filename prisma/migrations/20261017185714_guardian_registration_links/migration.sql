-- CreateTable
CREATE TABLE "guardian_registration_tokens" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_registration_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "linkValidityDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guardian_registration_tokens_token_key" ON "guardian_registration_tokens"("token");

-- CreateIndex
CREATE INDEX "guardian_registration_tokens_guardianId_idx" ON "guardian_registration_tokens"("guardianId");

-- AddForeignKey
ALTER TABLE "guardian_registration_tokens" ADD CONSTRAINT "guardian_registration_tokens_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_registration_tokens" ADD CONSTRAINT "guardian_registration_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
