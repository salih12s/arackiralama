-- Online rezervasyon alanları — geri alınabilir, mevcut veriyi bozmaz
ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "category" TEXT;

ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "reservation_code" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS "quoted_amount" INTEGER,
  ADD COLUMN IF NOT EXISTS "pickup_location" TEXT,
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "reservations_reservation_code_key"
  ON "reservations"("reservation_code");
