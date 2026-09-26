-- Production vehicle gallery and archive lifecycle.
ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "vehicle_images" (
  "id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "storage_key" TEXT,
  "alt_text" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicle_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vehicle_images_vehicle_id_sort_order_idx"
  ON "vehicle_images"("vehicle_id", "sort_order");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_images_vehicle_id_fkey'
  ) THEN
    ALTER TABLE "vehicle_images"
      ADD CONSTRAINT "vehicle_images_vehicle_id_fkey"
      FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
