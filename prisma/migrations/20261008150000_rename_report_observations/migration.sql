-- Rename report messages to report observations (in-place, preserves data).
-- The tables were introduced in 20261008140000_add_report_messages.

-- period_report_messages -> period_report_observations
ALTER TABLE "period_report_messages" RENAME TO "period_report_observations";

ALTER INDEX "period_report_messages_pkey" RENAME TO "period_report_observations_pkey";
ALTER INDEX "period_report_messages_termId_idx" RENAME TO "period_report_observations_termId_idx";
ALTER INDEX "period_report_messages_academicYearId_idx" RENAME TO "period_report_observations_academicYearId_idx";
ALTER INDEX "period_report_messages_recordedById_idx" RENAME TO "period_report_observations_recordedById_idx";
ALTER INDEX "period_report_messages_studentId_termId_academicYearId_key" RENAME TO "period_report_observations_studentId_termId_academicYearId_key";

ALTER TABLE "period_report_observations" RENAME CONSTRAINT "period_report_messages_studentId_fkey" TO "period_report_observations_studentId_fkey";
ALTER TABLE "period_report_observations" RENAME CONSTRAINT "period_report_messages_termId_fkey" TO "period_report_observations_termId_fkey";
ALTER TABLE "period_report_observations" RENAME CONSTRAINT "period_report_messages_academicYearId_fkey" TO "period_report_observations_academicYearId_fkey";
ALTER TABLE "period_report_observations" RENAME CONSTRAINT "period_report_messages_recordedById_fkey" TO "period_report_observations_recordedById_fkey";

-- year_report_messages -> year_report_observations
ALTER TABLE "year_report_messages" RENAME TO "year_report_observations";

ALTER INDEX "year_report_messages_pkey" RENAME TO "year_report_observations_pkey";
ALTER INDEX "year_report_messages_academicYearId_idx" RENAME TO "year_report_observations_academicYearId_idx";
ALTER INDEX "year_report_messages_recordedById_idx" RENAME TO "year_report_observations_recordedById_idx";
ALTER INDEX "year_report_messages_studentId_academicYearId_key" RENAME TO "year_report_observations_studentId_academicYearId_key";

ALTER TABLE "year_report_observations" RENAME CONSTRAINT "year_report_messages_studentId_fkey" TO "year_report_observations_studentId_fkey";
ALTER TABLE "year_report_observations" RENAME CONSTRAINT "year_report_messages_academicYearId_fkey" TO "year_report_observations_academicYearId_fkey";
ALTER TABLE "year_report_observations" RENAME CONSTRAINT "year_report_messages_recordedById_fkey" TO "year_report_observations_recordedById_fkey";
