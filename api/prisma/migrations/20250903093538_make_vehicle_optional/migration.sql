-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_vehicle_id_fkey";

-- AlterTable
ALTER TABLE "reservations" ALTER COLUMN "vehicle_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
