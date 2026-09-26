import { ReactNode, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Alert, Box, Button, IconButton, MenuItem, Skeleton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import {
  AccountBalanceWalletOutlined,
  Add,
  ArrowForward,
  DirectionsCarOutlined,
  EventAvailableOutlined,
  Refresh,
  TrendingUp,
} from "@mui/icons-material";
import NewRentalDialog from "../components/NewRentalDialog";
import { rentalsApi, reportsApi, reservationsApi, Rental, Reservation, vehiclesApi, Vehicle } from "../api/client";
import { formatCurrency } from "../utils/currency";
import { a, monoSx } from "../admin/theme";
import { DataTable, EmptyState, KpiTile, Money, PageHeader, Panel, Plate, Sub, Tone, StatusBadge } from "../admin/ui";
import { FleetBar, RevenueChart } from "../admin/charts";

/** /reports/monthly ve /reports/debtors kuruş döndürür; /stats/today TL döndürür. */
const kurus = (value: number | null | undefined) => (value || 0) / 100;

const greeting = () => {
  const hour = dayjs().hour();
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
};

/** Dönüş tarihine göre "3 gün kaldı" / "bugün" / "5 gün gecikti". */
function dueInfo(endDate: string): { text: string; tone: Tone } {
  const diff = dayjs(endDate).startOf("day").diff(dayjs().startOf("day"), "day");
  if (diff < 0) return { text: `${-diff} gün gecikti`, tone: "danger" };
  if (diff === 0) return { text: "Bugün dönüyor", tone: "warning" };
  if (diff === 1) return { text: "Yarın dönüyor", tone: "warning" };
  return { text: `${diff} gün kaldı`, tone: "neutral" };
}

const rentalPlate = (rental: Rental) => rental.vehicle?.plate || rental.vehiclePlate || "";
const rentalCustomer = (rental: Rental) => rental.customer?.fullName || rental.customerName || "—";
const rentalVehicle = (rental: Rental) => rental.vehicle?.name || rental.vehicleName || "";
const vehicleImage = (vehicle: Vehicle) =>
  vehicle.images?.find((image) => image.isPrimary)?.imageUrl || vehicle.images?.[0]?.imageUrl || vehicle.imageUrl || null;

/** "Bugün" şeridinde tek sütun. */
function TodayCell({ label, count, tone, to, items, empty }: {
  label: string;
  count: number;
  tone: Tone;
  to: string;
  items: { key: string; primary: ReactNode; secondary?: ReactNode }[];
  empty: string;
}) {
  const accent = count > 0 ? (tone === "danger" ? a.danger : tone === "warning" ? a.warning : tone === "accent" ? a.accent : a.ink) : a.subtle;
  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        p: 2.25,
        minWidth: 0,
        display: "grid",
        gap: 1,
        alignContent: "start",
        textDecoration: "none",
        color: "inherit",
        transition: "background-color .15s ease",
        "@media (hover: hover)": { "&:hover": { bgcolor: a.hover }, "&:hover .today-go": { opacity: 1, transform: "translateX(0)" } },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: a.muted }}>{label}</Typography>
        <ArrowForward className="today-go" sx={{ fontSize: 16, color: a.muted, opacity: 0, transform: "translateX(-4px)", transition: "opacity .15s ease, transform .2s ease" }} />
      </Stack>
      <Typography sx={{ ...monoSx, fontSize: 30, fontWeight: 500, lineHeight: 1, color: accent }}>{count}</Typography>
      <Box sx={{ display: "grid", gap: 0.6, mt: 0.5 }}>
        {items.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: a.subtle }}>{empty}</Typography>
        ) : (
          items.slice(0, 2).map((item) => (
            <Box key={item.key} sx={{ display: "flex", flexWrap: { xs: "wrap", sm: "nowrap" }, alignItems: "center", columnGap: 1, rowGap: 0.25, minWidth: 0 }}>
              {item.primary}
              {item.secondary && <Typography noWrap sx={{ fontSize: 12.5, color: a.muted, minWidth: 0 }}>{item.secondary}</Typography>}
            </Box>
          ))
        )}
        {items.length > 2 && <Typography sx={{ fontSize: 12, color: a.muted, fontWeight: 600 }}>+{items.length - 2} daha</Typography>}
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [newRentalOpen, setNewRentalOpen] = useState(false);
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [year, setYear] = useState(dayjs().year());

  const statsQuery = useQuery({
    queryKey: ["dashboard-stats", month, year],
    queryFn: () => reportsApi.getDashboardStats(month, year),
    staleTime: 30_000,
  });
  const rentalsQuery = useQuery({
    queryKey: ["active-rentals"],
    queryFn: () => rentalsApi.getAll({ status: "ACTIVE", limit: 100 }),
    staleTime: 30_000,
  });
  const vehiclesQuery = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.getAll(undefined, 1000),
    staleTime: 45_000,
  });
  const debtorsQuery = useQuery({
    queryKey: ["debtors-report"],
    queryFn: () => reportsApi.getDebtors(),
    staleTime: 45_000,
  });
  const reservationsQuery = useQuery({
    queryKey: ["reservations"],
    queryFn: () => reservationsApi.getAll(),
    staleTime: 15_000,
  });
  const monthlyQuery = useQuery({
    queryKey: ["monthly-report", year],
    queryFn: () => reportsApi.getMonthlyReport(year),
    staleTime: 60_000,
  });

  const stats = statsQuery.data?.data;
  // API durum filtresini her zaman uygulamıyor; aktif olanları burada ayıkla.
  const activeRentals: Rental[] = useMemo(
    () => (rentalsQuery.data?.data.data || []).filter((rental: Rental) => rental.status === "ACTIVE"),
    [rentalsQuery.data],
  );
  const vehicles: Vehicle[] = vehiclesQuery.data?.data || [];
  const debtors = (debtorsQuery.data?.data || []) as unknown as { totalDebt: number }[];
  const reservations: Reservation[] = reservationsQuery.data?.data || [];
  const today = dayjs().format("YYYY-MM-DD");

  const sortedActive = useMemo(
    () => [...activeRentals].sort((x, y) => dayjs(x.endDate).valueOf() - dayjs(y.endDate).valueOf()),
    [activeRentals],
  );
  const overdue = sortedActive.filter((rental) => dayjs(rental.endDate).format("YYYY-MM-DD") < today);
  const returningToday = sortedActive.filter((rental) => dayjs(rental.endDate).format("YYYY-MM-DD") === today);
  const pickupsToday = reservations.filter(
    (item) => (item.status === "PENDING" || item.status === "CONFIRMED") && dayjs(item.reservationDate).format("YYYY-MM-DD") === today,
  );
  const pendingWeb = useMemo(
    () =>
      reservations
        .filter((item) => item.source === "WEB" && item.status === "PENDING")
        .sort((x, y) => dayjs(x.reservationDate).valueOf() - dayjs(y.reservationDate).valueOf()),
    [reservations],
  );
  const idleVehicles = vehicles.filter((vehicle) => vehicle.status === "IDLE" && !vehicle.archivedAt);

  const totalDebt = kurus(debtors.reduce((sum, debtor) => sum + (debtor.totalDebt || 0), 0));
  const fleetCounts = {
    rented: stats?.totalVehicles ? stats.totalVehicles - stats.idle - stats.reserved - stats.service : 0,
    idle: stats?.idle || 0,
    reserved: stats?.reserved || 0,
    service: stats?.service || 0,
  };
  const totalVehicles = stats?.totalVehicles || 0;
  const billed = stats?.monthBilled || 0;
  const collected = stats?.monthCollected || 0;
  const monthName = dayjs().month(month - 1).format("MMMM");

  const revenueData = useMemo(() => {
    const rows = monthlyQuery.data?.data || [];
    return Array.from({ length: 12 }, (_, index) => {
      const row = rows.find((item) => item.month === index + 1);
      return { label: dayjs().month(index).format("MMM"), billed: kurus(row?.billed), collected: kurus(row?.collected) };
    });
  }, [monthlyQuery.data]);

  const kpiLoading = statsQuery.isLoading;
  const refreshAll = () => {
    statsQuery.refetch();
    rentalsQuery.refetch();
    vehiclesQuery.refetch();
    debtorsQuery.refetch();
    reservationsQuery.refetch();
    monthlyQuery.refetch();
  };

  const summary = [
    `${fleetCounts.rented} araç kirada`,
    overdue.length ? `${overdue.length} gecikmiş iade` : null,
    pendingWeb.length ? `${pendingWeb.length} talep onay bekliyor` : null,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        eyebrow={greeting()}
        title="Genel bakış"
        subtitle={statsQuery.isLoading ? " " : summary}
        actions={
          <>
            <TextField select value={month} onChange={(e) => setMonth(Number(e.target.value))} inputProps={{ "aria-label": "Ay" }} sx={{ minWidth: 128 }}>
              {Array.from({ length: 12 }, (_, index) => (
                <MenuItem key={index} value={index + 1}>{dayjs().month(index).format("MMMM")}</MenuItem>
              ))}
            </TextField>
            <TextField select value={year} onChange={(e) => setYear(Number(e.target.value))} inputProps={{ "aria-label": "Yıl" }} sx={{ minWidth: 92 }}>
              {[dayjs().year() - 1, dayjs().year(), dayjs().year() + 1].map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </TextField>
            <Tooltip title="Verileri yenile">
              <IconButton onClick={refreshAll} aria-label="Verileri yenile" sx={{ border: `1px solid ${a.line}`, bgcolor: a.raised }}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => setNewRentalOpen(true)}>Yeni kiralama</Button>
          </>
        }
      />

      {statsQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>Özet verileri yüklenemedi. Yenile düğmesini deneyin.</Alert>
      )}

      {/* ---------------- Bugün ---------------- */}
      <Box
        component="section"
        aria-label="Bugün"
        sx={{
          bgcolor: a.raised,
          border: `1px solid ${a.lineSoft}`,
          borderRadius: "14px",
          boxShadow: a.shadow,
          overflow: "hidden",
          mb: 2,
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          // Mobilde 2×2 ızgara, geniş ekranda tek sıra: aradaki çizgiler buna göre.
          "& > *": { borderRight: `1px solid ${a.lineSoft}`, borderBottom: { xs: `1px solid ${a.lineSoft}`, lg: 0 } },
          "& > *:nth-of-type(2n)": { borderRight: { xs: 0, lg: `1px solid ${a.lineSoft}` } },
          "& > *:nth-of-type(4n)": { borderRight: 0 },
          "& > *:nth-last-of-type(-n+2)": { borderBottom: 0 },
        }}
      >
        <TodayCell
          label="Gecikmiş iade"
          count={overdue.length}
          tone="danger"
          to="/panel/kiralamalar"
          empty="Geciken araç yok"
          items={overdue.map((rental) => ({ key: rental.id, primary: <Plate value={rentalPlate(rental)} size="sm" />, secondary: dueInfo(rental.endDate).text }))}
        />
        <TodayCell
          label="Bugün iade alınacak"
          count={returningToday.length}
          tone="warning"
          to="/panel/kiralamalar"
          empty="Bugün dönüş yok"
          items={returningToday.map((rental) => ({ key: rental.id, primary: <Plate value={rentalPlate(rental)} size="sm" />, secondary: rentalCustomer(rental) }))}
        />
        <TodayCell
          label="Bugün teslim edilecek"
          count={pickupsToday.length}
          tone="accent"
          to="/panel/rezervasyonlar"
          empty="Bugün teslim yok"
          items={pickupsToday.map((item) => ({ key: item.id, primary: <Plate value={item.licensePlate} size="sm" />, secondary: `${item.reservationTime || ""} ${item.customerName}` }))}
        />
        <TodayCell
          label="Onay bekleyen talep"
          count={pendingWeb.length}
          tone="accent"
          to="/panel/rezervasyonlar"
          empty="Bekleyen talep yok"
          items={pendingWeb.map((item) => ({ key: item.id, primary: <Box component="span" sx={{ ...monoSx, fontSize: 12.5, color: a.ink }}>{item.reservationCode || "WEB"}</Box>, secondary: item.customerName }))}
        />
      </Box>

      {/* ---------------- Göstergeler ---------------- */}
      <Box sx={{ display: "grid", gap: 2, mb: 2, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
        <KpiTile
          label="Kiradaki araç"
          icon={<DirectionsCarOutlined />}
          loading={kpiLoading}
          value={<>{fleetCounts.rented}<Box component="span" sx={{ color: a.subtle, fontSize: "0.7em" }}> / {totalVehicles}</Box></>}
          progress={totalVehicles ? fleetCounts.rented / totalVehicles : 0}
          meta={totalVehicles ? `Doluluk %${Math.round((fleetCounts.rented / totalVehicles) * 100)}` : "Filo boş"}
        />
        <KpiTile label={`${monthName} faturalanan`} icon={<TrendingUp />} loading={kpiLoading} value={formatCurrency(billed)} meta="Seçili ayda kesilen kiralama tutarı" />
        <KpiTile
          label="Tahsil edilen"
          icon={<EventAvailableOutlined />}
          loading={kpiLoading}
          value={formatCurrency(collected)}
          progress={billed ? collected / billed : 0}
          meta={billed ? `Faturanın %${Math.round((collected / billed) * 100)}'i tahsil edildi` : "Bu ay fatura yok"}
        />
        <KpiTile
          label="Açık bakiye"
          icon={<AccountBalanceWalletOutlined />}
          loading={debtorsQuery.isLoading}
          value={formatCurrency(totalDebt)}
          meta={`${debtors.length} müşteride alacak`}
        />
      </Box>

      {/* ---------------- Aktif kiralamalar + yan sütun ---------------- */}
      <Box sx={{ display: "grid", gap: 2, mb: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 2fr) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Panel
          padded={false}
          title="Aktif kiralamalar"
          subtitle={`${activeRentals.length} araç yolda, dönüş tarihine göre sıralı`}
          action={<Button size="small" endIcon={<ArrowForward sx={{ fontSize: 16 }} />} onClick={() => navigate("/panel/kiralamalar")}>Tümü</Button>}
        >
          <DataTable
            rows={sortedActive}
            rowKey={(rental) => rental.id}
            loading={rentalsQuery.isLoading}
            onRowClick={(rental) => navigate(`/panel/kiralamalar/${rental.id}`)}
            empty={<EmptyState compact title="Yolda araç yok" subtitle="Yeni kiralama başlattığınızda burada görünür." />}
            columns={[
              { key: "plate", header: "Plaka", render: (rental) => <Plate value={rentalPlate(rental)} /> },
              { key: "customer", header: "Müşteri", render: (rental) => <><Box component="span" sx={{ fontWeight: 700 }}>{rentalCustomer(rental)}</Box><Sub>{rentalVehicle(rental)}</Sub></> },
              {
                key: "end",
                header: "Dönüş",
                render: (rental) => {
                  const due = dueInfo(rental.endDate);
                  return <><Box component="span" sx={{ ...monoSx, fontSize: 13.5 }}>{dayjs(rental.endDate).format("DD.MM.YYYY")}</Box><Box sx={{ mt: 0.4 }}><StatusBadge label={due.text} tone={due.tone} /></Box></>;
                },
              },
              { key: "balance", header: "Kalan", align: "right", render: (rental) => <Money value={rental.balance} tone={rental.balance > 0 ? "danger" : "muted"} strong={rental.balance > 0} /> },
            ]}
            mobileRow={(rental) => {
              const due = dueInfo(rental.endDate);
              return (
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                  <Box sx={{ minWidth: 0 }}>
                    <Plate value={rentalPlate(rental)} size="sm" />
                    <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, mt: 0.5 }}>{rentalCustomer(rental)}</Typography>
                    <Box sx={{ mt: 0.5 }}><StatusBadge label={due.text} tone={due.tone} /></Box>
                  </Box>
                  <Money value={rental.balance} tone={rental.balance > 0 ? "danger" : "muted"} strong={rental.balance > 0} />
                </Stack>
              );
            }}
          />
        </Panel>

        <Stack spacing={2}>
          <Panel title="Filo durumu" subtitle={`${totalVehicles} aktif araç`}>
            {kpiLoading ? <Skeleton height={80} /> : (
              <FleetBar
                segments={[
                  { key: "rented", label: "Kirada", value: fleetCounts.rented, color: a.chart1 },
                  { key: "idle", label: "Müsait", value: fleetCounts.idle, color: "#3F8A5A" },
                  { key: "reserved", label: "Rezerve", value: fleetCounts.reserved, color: a.chart2 },
                  { key: "service", label: "Serviste", value: fleetCounts.service, color: "#968984" },
                ]}
              />
            )}
          </Panel>

          <Panel
            padded={false}
            title="Web talepleri"
            subtitle="Siteden gelen, onay bekleyen"
            action={<Button size="small" endIcon={<ArrowForward sx={{ fontSize: 16 }} />} onClick={() => navigate("/panel/rezervasyonlar")}>Yönet</Button>}
          >
            {reservationsQuery.isLoading ? <Box sx={{ px: 2.5, pb: 2 }}><Skeleton height={56} /><Skeleton height={56} /></Box> : pendingWeb.length === 0 ? (
              <EmptyState compact title="Bekleyen talep yok" subtitle="Siteden yeni talep geldiğinde burada görünür." />
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {pendingWeb.slice(0, 5).map((item) => (
                  <Box
                    component="li"
                    key={item.id}
                    onClick={() => navigate("/panel/rezervasyonlar")}
                    sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${a.lineSoft}`, cursor: "pointer", "@media (hover: hover)": { "&:hover": { bgcolor: a.hover } } }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: 14 }}>{item.customerName}</Typography>
                      <Box component="span" sx={{ ...monoSx, fontSize: 12, color: a.muted }}>{item.reservationCode}</Box>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mt: 0.4 }}>
                      <Typography noWrap sx={{ fontSize: 12.5, color: a.muted }}>
                        {item.vehicle?.name || item.licensePlate} · {dayjs(item.reservationDate).format("DD MMM")} · {item.rentalDuration} gün
                      </Typography>
                      {item.quotedAmount != null && <Money value={item.quotedAmount / 100} />}
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Stack>
      </Box>

      {/* ---------------- Gelir + müsait araçlar ---------------- */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 2fr) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Panel title={`${year} gelir akışı`} subtitle="Aylara göre faturalanan ve tahsil edilen tutar">
          {monthlyQuery.isLoading ? <Skeleton variant="rounded" height={260} /> : monthlyQuery.isError ? (
            <Alert severity="warning">Aylık rapor yüklenemedi.</Alert>
          ) : (
            <RevenueChart data={revenueData} />
          )}
        </Panel>

        <Panel
          padded={false}
          title="Müsait araçlar"
          subtitle={`${idleVehicles.length} araç kiralamaya hazır`}
          action={<Button size="small" endIcon={<ArrowForward sx={{ fontSize: 16 }} />} onClick={() => navigate("/panel/araclar")}>Araçlar</Button>}
        >
          {vehiclesQuery.isLoading ? <Box sx={{ px: 2.5, pb: 2 }}><Skeleton height={52} /><Skeleton height={52} /></Box> : idleVehicles.length === 0 ? (
            <EmptyState compact title="Müsait araç yok" />
          ) : (
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, maxHeight: 336, overflowY: "auto" }}>
              {idleVehicles.map((vehicle) => {
                const image = vehicleImage(vehicle);
                return (
                  <Box component="li" key={vehicle.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.1, borderTop: `1px solid ${a.lineSoft}` }}>
                    <Box sx={{ width: 56, height: 38, borderRadius: "8px", overflow: "hidden", bgcolor: a.surface, flex: "none", display: "grid", placeItems: "center", color: a.subtle }}>
                      {image ? <Box component="img" src={image} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <DirectionsCarOutlined sx={{ fontSize: 18 }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: 13.5 }}>{vehicle.name || vehicle.plate}</Typography>
                      <Plate value={vehicle.plate} size="sm" />
                    </Box>
                    {vehicle.dailyRate != null && (
                      <Box sx={{ textAlign: "right" }}>
                        <Money value={vehicle.dailyRate / 100} />
                        <Sub>günlük</Sub>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Panel>
      </Box>

      <NewRentalDialog open={newRentalOpen} onClose={() => setNewRentalOpen(false)} />
    </>
  );
}

