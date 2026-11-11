ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'INVESTIGATING';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'WAITING_CUSTOMER';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'WAITING_COURIER';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'RETURN_REQUESTED';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'REFUND_APPROVED';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'REFUND_PROCESSING';
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

ALTER TABLE "RefundRequest"
  ADD COLUMN "refundMethod" TEXT,
  ADD COLUMN "refundReference" TEXT,
  ADD COLUMN "refundProcessedAt" TIMESTAMP(3);

ALTER TABLE "OrderItem"
  ADD COLUMN "shippedAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);

CREATE TABLE "RefundRequestEvent" (
  "id" TEXT NOT NULL,
  "refundRequestId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefundRequestEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RefundRequestEvent_refundRequestId_createdAt_idx"
  ON "RefundRequestEvent"("refundRequestId", "createdAt");

ALTER TABLE "RefundRequestEvent"
  ADD CONSTRAINT "RefundRequestEvent_refundRequestId_fkey"
  FOREIGN KEY ("refundRequestId") REFERENCES "RefundRequest"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
