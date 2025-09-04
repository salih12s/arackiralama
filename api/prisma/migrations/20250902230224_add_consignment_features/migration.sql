-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "is_consignment" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "consignment_rentals" (
    "id" TEXT NOT NULL,
    "general_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consignment_rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consignment_deductions" (
    "id" TEXT NOT NULL,
    "consignment_rental_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consignment_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_payments" (
    "id" TEXT NOT NULL,
    "consignment_rental_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_payments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "consignment_deductions" ADD CONSTRAINT "consignment_deductions_consignment_rental_id_fkey" FOREIGN KEY ("consignment_rental_id") REFERENCES "consignment_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consignment_deductions" ADD CONSTRAINT "consignment_deductions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_payments" ADD CONSTRAINT "external_payments_consignment_rental_id_fkey" FOREIGN KEY ("consignment_rental_id") REFERENCES "consignment_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_payments" ADD CONSTRAINT "external_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
