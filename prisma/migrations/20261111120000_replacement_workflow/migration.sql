ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'REPLACEMENT_APPROVED';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'REPLACEMENT_SHIPPED';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'REPLACEMENT_DELIVERED';

ALTER TABLE "RefundRequest"
  ADD COLUMN IF NOT EXISTS "costBearer" TEXT,
  ADD COLUMN IF NOT EXISTS "replacementStockDeducted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "replacementTrackingNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "replacementCarrier" TEXT,
  ADD COLUMN IF NOT EXISTS "replacementLogisticId" TEXT,
  ADD COLUMN IF NOT EXISTS "replacementShippedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "replacementDeliveredAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "RefundRequest_replacementTrackingNumber_idx"
  ON "RefundRequest"("replacementTrackingNumber");

CREATE INDEX IF NOT EXISTS "RefundRequest_replacementLogisticId_idx"
  ON "RefundRequest"("replacementLogisticId");

