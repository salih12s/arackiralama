-- Hatalı ödemeleri kontrol et (100x fazla kaydedilmiş)
SELECT p.id, p."rentalId", p.amount, r."totalDue", r."customerId", c."fullName"
FROM "Payment" p
JOIN "Rental" r ON p."rentalId" = r.id
JOIN "Customer" c ON r."customerId" = c.id
WHERE p.amount >= 1000000  -- 10.000 TL üzeri (kuruş)
ORDER BY p.amount DESC;
