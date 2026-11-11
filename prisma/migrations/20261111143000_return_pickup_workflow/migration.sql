ALTER TABLE "RefundRequest"
  ADD COLUMN IF NOT EXISTS "returnTrackingNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "returnCarrier" TEXT,
  ADD COLUMN IF NOT EXISTS "returnLogisticId" TEXT,
  ADD COLUMN IF NOT EXISTS "returnShippedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "returnReceivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "RefundRequest_returnTrackingNumber_idx"
  ON "RefundRequest"("returnTrackingNumber");

CREATE INDEX IF NOT EXISTS "RefundRequest_returnLogisticId_idx"
  ON "RefundRequest"("returnLogisticId");

