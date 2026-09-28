-- AlterTable
ALTER TABLE "class_sessions" DROP COLUMN "period",
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "startTime" TEXT;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "competencies" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "competencies_subjectId_idx" ON "competencies"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "competencies_subjectId_name_key" ON "competencies"("subjectId", "name");

-- AddForeignKey
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
