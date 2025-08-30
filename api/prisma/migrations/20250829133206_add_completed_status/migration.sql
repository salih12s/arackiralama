-- AlterEnum
ALTER TYPE "RentalStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "completed_at" TIMESTAMP(3);
