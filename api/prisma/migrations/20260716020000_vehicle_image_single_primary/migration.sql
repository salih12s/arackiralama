-- Enforce the gallery invariant at the database boundary as well as in the
-- transactional service: a vehicle can have at most one primary image.
CREATE UNIQUE INDEX "vehicle_images_one_primary_per_vehicle"
ON "vehicle_images" ("vehicle_id")
WHERE "is_primary" = true;
