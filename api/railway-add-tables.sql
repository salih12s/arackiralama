-- Railway'de manuel olarak çalıştırılacak SQL
-- Bu SQL, mevcut database'i bozmadan yeni tabloları ekler

-- VehicleExpense tablosunu oluştur
CREATE TABLE IF NOT EXISTS "vehicle_expenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "expense_type" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_expenses_pkey" PRIMARY KEY ("id")
);

-- Note tablosunu oluştur
CREATE TABLE IF NOT EXISTS "notes" (
    "id" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- Foreign key constraint ekle (sadece tablo varsa ve constraint yoksa)
DO $$ 
BEGIN
    -- Önce vehicle_expenses tablosunun varlığını kontrol et
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_expenses') THEN
        -- Constraint yoksa ekle
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'vehicle_expenses_vehicle_id_fkey'
        ) THEN
            ALTER TABLE "vehicle_expenses" 
            ADD CONSTRAINT "vehicle_expenses_vehicle_id_fkey" 
            FOREIGN KEY ("vehicle_id") 
            REFERENCES "vehicles"("id") 
            ON DELETE RESTRICT 
            ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Tabloların oluşturulduğunu kontrol et
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_expenses') 
        THEN '✅ vehicle_expenses tablosu hazır'
        ELSE '❌ vehicle_expenses tablosu oluşturulamadı'
    END as vehicle_expenses_status,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notes') 
        THEN '✅ notes tablosu hazır'
        ELSE '❌ notes tablosu oluşturulamadı'
    END as notes_status;
