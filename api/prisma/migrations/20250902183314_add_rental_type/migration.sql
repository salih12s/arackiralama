-- CreateEnum
CREATE TYPE "RentalType" AS ENUM ('NEW', 'EXTENSION');

-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "rental_type" "RentalType" NOT NULL DEFAULT 'NEW';
