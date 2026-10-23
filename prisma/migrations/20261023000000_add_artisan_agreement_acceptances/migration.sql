-- Immutable acceptance evidence for each published Artisan Agreement version.
CREATE TABLE "ArtisanAgreementAcceptance" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "agreementVersion" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptanceMethod" TEXT NOT NULL DEFAULT 'CLICKWRAP',
    "signerUserId" TEXT NOT NULL,
    "signerName" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "ArtisanAgreementAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArtisanAgreementAcceptance_artisanId_agreementVersion_key"
    ON "ArtisanAgreementAcceptance"("artisanId", "agreementVersion");

CREATE INDEX "ArtisanAgreementAcceptance_artisanId_acceptedAt_idx"
    ON "ArtisanAgreementAcceptance"("artisanId", "acceptedAt");

ALTER TABLE "ArtisanAgreementAcceptance"
    ADD CONSTRAINT "ArtisanAgreementAcceptance_artisanId_fkey"
    FOREIGN KEY ("artisanId") REFERENCES "ArtisanProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
