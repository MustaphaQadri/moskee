-- CreateTable
CREATE TABLE "period_report_messages" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "period_report_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "year_report_messages" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "year_report_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "period_report_messages_termId_idx" ON "period_report_messages"("termId");

-- CreateIndex
CREATE INDEX "period_report_messages_academicYearId_idx" ON "period_report_messages"("academicYearId");

-- CreateIndex
CREATE INDEX "period_report_messages_recordedById_idx" ON "period_report_messages"("recordedById");

-- CreateIndex
CREATE UNIQUE INDEX "period_report_messages_studentId_termId_academicYearId_key" ON "period_report_messages"("studentId", "termId", "academicYearId");

-- CreateIndex
CREATE INDEX "year_report_messages_academicYearId_idx" ON "year_report_messages"("academicYearId");

-- CreateIndex
CREATE INDEX "year_report_messages_recordedById_idx" ON "year_report_messages"("recordedById");

-- CreateIndex
CREATE UNIQUE INDEX "year_report_messages_studentId_academicYearId_key" ON "year_report_messages"("studentId", "academicYearId");

-- AddForeignKey
ALTER TABLE "period_report_messages" ADD CONSTRAINT "period_report_messages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_report_messages" ADD CONSTRAINT "period_report_messages_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_report_messages" ADD CONSTRAINT "period_report_messages_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_report_messages" ADD CONSTRAINT "period_report_messages_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "year_report_messages" ADD CONSTRAINT "year_report_messages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "year_report_messages" ADD CONSTRAINT "year_report_messages_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "year_report_messages" ADD CONSTRAINT "year_report_messages_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
