import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { Close, DirectionsCarOutlined, OpenInNew } from "@mui/icons-material";
import { vehiclesApi } from "../api/client";
import { formatCurrency } from "../utils/currency";
import { maskPhone } from "../utils/privacy";
import { getRentalFinancials } from "../utils/rentalFinancials";
import { normalizeVehicleRentals, vehicleRentalStats } from "../utils/vehicleRentals";
import { a, fonts, monoSx } from "../admin/theme";
import { DataTable, EmptyState, KpiTile, Money, Plate, Status, Sub } from "../admin/ui";

interface VehicleDetailDialogProps {
  vehicleId: string | null;
  open: boolean;
  onClose: () => void;
}

const titleCase = (value?: string | null) =>
  value ? value.toLocaleLowerCase("tr-TR").replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase("tr-TR")).replace(/\bSuv\b/, "SUV") : "";

export default function VehicleDetailDialog({ vehicleId, open, onClose }: VehicleDetailDialogProps) {
  const navigate = useNavigate();
  const vehicleQuery = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => vehiclesApi.getById(vehicleId!),
    enabled: open && Boolean(vehicleId),
  });

  const vehicle = vehicleQuery.data?.data;
  const rentals = useMemo(() => normalizeVehicleRentals(vehicle?.rentals), [vehicle?.rentals]);
  const stats = useMemo(() => vehicleRentalStats(rentals), [rentals]);
  const cover = vehicle?.images?.find((image) => image.isPrimary)?.imageUrl || vehicle?.images?.[0]?.imageUrl || vehicle?.imageUrl;
  const specs = vehicle
    ? [titleCase(vehicle.category), titleCase(vehicle.transmission), titleCase(vehicle.fuelType), vehicle.seats ? `${vehicle.seats} kişi` : "", vehicle.year ? String(vehicle.year) : ""].filter(Boolean).join(" · ")
    : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="vehicle-detail-dialog-title"
      PaperProps={{ sx: { m: { xs: 1.5, sm: 3 }, width: { xs: "calc(100% - 24px)", sm: "calc(100% - 48px)" }, maxHeight: { xs: "calc(100% - 24px)", sm: "92vh" } } }}
    >
      <Box sx={{ position: "relative" }}>
        <IconButton onClick={onClose} aria-label="Araç detayını kapat" sx={{ position: "absolute", top: 10, right: 10, zIndex: 2, bgcolor: a.glass, backdropFilter: "blur(8px)" }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {vehicleQuery.isLoading ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={150} />
            <Skeleton variant="rounded" height={90} />
            <Skeleton variant="rounded" height={200} />
          </Stack>
        ) : vehicleQuery.isError || !vehicle ? (
          <EmptyState icon={<DirectionsCarOutlined />} title="Araç bilgileri yüklenemedi" subtitle="Bağlantınızı kontrol edip tekrar deneyin." />
        ) : (
          <Stack spacing={2.5}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, alignItems: "center", pr: 5 }}>
              <Box sx={{ width: { xs: "100%", sm: 200 }, aspectRatio: "16 / 10", borderRadius: "12px", overflow: "hidden", bgcolor: a.surface, display: "grid", placeItems: "center", color: a.subtle, flex: "none" }}>
                {cover ? <Box component="img" src={cover} alt={vehicle.name || vehicle.plate} sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <DirectionsCarOutlined sx={{ fontSize: 34 }} />}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  <Plate value={vehicle.plate} />
                  <Status value={vehicle.status} />
                </Stack>
                <Typography id="vehicle-detail-dialog-title" component="h2" sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: { xs: 24, sm: 28 }, lineHeight: 1.15 }}>
                  {vehicle.name || "Model belirtilmemiş"}
                </Typography>
                <Typography sx={{ color: a.muted, mt: 0.5, fontSize: 14 }}>{specs || "Özellik girilmemiş"}</Typography>
                {vehicle.dailyRate != null && (
                  <Typography sx={{ ...monoSx, mt: 0.5, fontSize: 14 }}>
                    {formatCurrency(vehicle.dailyRate / 100)} <Box component="span" sx={{ color: a.muted, fontFamily: fonts.sans }}>/ gün</Box>
                  </Typography>
                )}
              </Box>
            </Box>

            {vehicle.description && (
              <Typography sx={{ color: a.muted, fontSize: 14, whiteSpace: "pre-line" }}>{vehicle.description}</Typography>
            )}

            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" } }}>
              <KpiTile label="Kiralama" value={rentals.length} meta={`${stats.active} aktif`} />
              <KpiTile label="Araç kazancı" value={formatCurrency(stats.rentAndKm)} meta="Kira + KM" />
              <KpiTile label="90 gün doluluk" value={`%${Math.round(stats.utilization * 100)}`} progress={stats.utilization} />
              <KpiTile label="Kalan bakiye" value={<Box component="span" sx={{ color: stats.outstanding > 0 ? a.danger : a.ink }}>{formatCurrency(stats.outstanding)}</Box>} />
            </Box>

            <Box sx={{ border: `1px solid ${a.lineSoft}`, borderRadius: "12px", overflow: "hidden" }}>
              <Typography sx={{ fontWeight: 800, fontSize: 15, px: 2.5, pt: 2, pb: 1.25 }}>Son kiralamalar</Typography>
              <DataTable
                dense
                rows={rentals.slice(0, 6)}
                rowKey={(rental) => rental.id}
                onRowClick={(rental) => { onClose(); navigate(`/panel/kiralamalar/${rental.id}`); }}
                empty={<EmptyState compact title="Henüz kiralama yok" />}
                columns={[
                  { key: "period", header: "Dönem", render: (rental) => <Box component="span" sx={{ ...monoSx, fontSize: 12.5, whiteSpace: "nowrap" }}>{dayjs(rental.startDate).format("DD.MM.YY")} → {dayjs(rental.endDate).format("DD.MM.YY")}</Box> },
                  { key: "customer", header: "Müşteri", render: (rental) => <><Box component="span" sx={{ fontWeight: 700 }}>{rental.customer?.fullName || "—"}</Box>{rental.customer?.phone && <Sub>{maskPhone(rental.customer.phone)}</Sub>}</> },
                  { key: "total", header: "Toplam", align: "right", hideBelow: "sm", render: (rental) => <Money value={getRentalFinancials(rental).totalAmount} /> },
                  { key: "balance", header: "Kalan", align: "right", render: (rental) => { const { balance } = getRentalFinancials(rental); return <Money value={balance} tone={balance > 0 ? "danger" : "muted"} strong={balance > 0} />; } },
                  { key: "status", header: "Durum", hideBelow: "sm", render: (rental) => <Status value={rental.status} /> },
                ]}
              />
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button variant="outlined" onClick={onClose}>Kapat</Button>
        {vehicle && (
          <Button variant="contained" endIcon={<OpenInNew sx={{ fontSize: 17 }} />} onClick={() => { onClose(); navigate(`/panel/araclar/${vehicle.id}`); }}>
            Tam sayfa
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
