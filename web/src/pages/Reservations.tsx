import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Alert, Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Check, CloseRounded, EventBusyOutlined, Refresh } from "@mui/icons-material";
import { Reservation, reservationsApi } from "../api/client";
import { maskPhone } from "../utils/privacy";
import { a, monoSx } from "../admin/theme";
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterTabs,
  KpiTile,
  Money,
  PageHeader,
  Plate,
  RowActions,
  SearchField,
  Status,
  StatusBadge,
  Sub,
  Toolbar,
  panelSx, kpiRow3Sx } from "../admin/ui";

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED";
type SourceFilter = "ALL" | "WEB";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "PENDING", label: "Bekleyen" },
  { value: "CONFIRMED", label: "Onaylı" },
  { value: "CANCELLED", label: "İptal" },
  { value: "ALL", label: "Tümü" },
];

/** Rezervasyon başlangıcına kalan süre: "yarın", "3 gün sonra", "geçti". */
function startsIn(date: string) {
  const diff = dayjs(date).startOf("day").diff(dayjs().startOf("day"), "day");
  if (diff < 0) return { text: "Tarihi geçti", tone: "danger" as const };
  if (diff === 0) return { text: "Bugün", tone: "warning" as const };
  if (diff === 1) return { text: "Yarın", tone: "warning" as const };
  return { text: `${diff} gün sonra`, tone: "neutral" as const };
}

export default function Reservations() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("WEB");
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);

  const reservationsQuery = useQuery({
    queryKey: ["reservations"],
    queryFn: () => reservationsApi.getAll(),
    staleTime: 15_000,
  });
  const action = useMutation({
    mutationFn: ({ id, type }: { id: string; type: "confirm" | "cancel" }) =>
      type === "confirm" ? reservationsApi.confirm(id) : reservationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setCancelTarget(null);
    },
  });

  const reservations = reservationsQuery.data?.data || [];
  const webReservations = reservations.filter((item) => item.source === "WEB");

  // Kaynak + arama (sekme sayıları bunlara göre)
  const base = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    return reservations
      .filter((item) => sourceFilter === "ALL" || item.source === "WEB")
      .filter((item) =>
        !query ||
        [item.reservationCode, item.customer?.fullName, item.customerName, item.vehicle?.name, item.vehicle?.plate, item.licensePlate]
          .filter(Boolean)
          .some((field) => String(field).toLocaleLowerCase("tr-TR").includes(query)),
      )
      .sort((x, y) => dayjs(x.reservationDate).valueOf() - dayjs(y.reservationDate).valueOf());
  }, [reservations, sourceFilter, search]);

  const visible = useMemo(
    () => (statusFilter === "ALL" ? base : base.filter((item) => item.status === statusFilter)),
    [base, statusFilter],
  );
  const counts = useMemo(() => {
    const result: Record<string, number> = { ALL: base.length };
    for (const item of base) result[item.status] = (result[item.status] || 0) + 1;
    return result;
  }, [base]);

  const pendingWeb = webReservations.filter((item) => item.status === "PENDING");
  const confirmedWeb = webReservations.filter((item) => item.status === "CONFIRMED");
  const upcoming = pendingWeb.filter((item) => dayjs(item.reservationDate).isAfter(dayjs().subtract(1, "day"))).length;

  const customerName = (item: Reservation) => item.customer?.fullName || item.customerName;
  const confirm = (item: Reservation) => action.mutate({ id: item.id, type: "confirm" });

  const actionsFor = (item: Reservation) => ({
    primary: item.status === "PENDING"
      ? { label: "Onayla", icon: <Check />, disabled: action.isPending, onClick: () => confirm(item) }
      : null,
    items: [
      { label: "Talebi iptal et", icon: <CloseRounded />, danger: true, hidden: item.status !== "PENDING", onClick: () => setCancelTarget(item) },
    ],
  });

  return (
    <>
      <PageHeader
        title="Rezervasyonlar"
        subtitle="Siteden gelen talepleri doğrulayın, onaylayın ya da iptal edin."
        actions={
          <Tooltip title="Yenile">
            <IconButton onClick={() => reservationsQuery.refetch()} disabled={reservationsQuery.isFetching} aria-label="Yenile" sx={{ border: `1px solid ${a.line}`, bgcolor: a.raised }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      />

      <Box sx={kpiRow3Sx}>
        <KpiTile label="Bekleyen web talebi" loading={reservationsQuery.isLoading} value={<Box component="span" sx={{ color: pendingWeb.length ? a.warning : a.ink }}>{pendingWeb.length}</Box>} meta="Onay bekliyor" />
        <KpiTile label="Yaklaşan" loading={reservationsQuery.isLoading} value={upcoming} meta="Tarihi gelmemiş bekleyen" />
        <KpiTile label="Onaylanmış web" loading={reservationsQuery.isLoading} value={confirmedWeb.length} meta="Kesinleşen talepler" />
      </Box>

      {reservationsQuery.isError && <Alert severity="error" sx={{ mb: 2 }}>Rezervasyonlar yüklenemedi.</Alert>}
      {action.isError && !cancelTarget && (
        <Alert severity="error" sx={{ mb: 2 }}>{(action.error as any)?.response?.data?.error || "İşlem gerçekleştirilemedi."}</Alert>
      )}

      <Box sx={panelSx}>
        <Toolbar>
          <FilterTabs label="Durum" value={statusFilter} onChange={setStatusFilter} options={STATUS_TABS.map((tab) => ({ ...tab, count: counts[tab.value] || 0 }))} />
          <FilterTabs
            label="Kaynak"
            value={sourceFilter}
            onChange={setSourceFilter}
            options={[{ value: "WEB", label: "Web" }, { value: "ALL", label: "Tüm kaynaklar" }]}
          />
          <Box sx={{ flex: 1 }} />
          <SearchField value={search} onChange={setSearch} placeholder="Kod, müşteri, araç" sx={{ width: { xs: "100%", sm: 230 } }} />
        </Toolbar>

        <DataTable
          rows={visible}
          rowKey={(item) => item.id}
          loading={reservationsQuery.isLoading}
          empty={<EmptyState icon={<EventBusyOutlined />} title="Bu filtrede talep yok" subtitle={statusFilter === "PENDING" ? "Bekleyen talep kalmadı." : "Başka bir sekme deneyin."} />}
          columns={[
            {
              key: "code",
              header: "Talep",
              render: (item) => (
                <>
                  <Box component="span" sx={{ ...monoSx, fontWeight: 500, fontSize: 13.5 }}>{item.reservationCode || item.id.slice(0, 8)}</Box>
                  <Sub>{item.source === "WEB" ? "Web" : "Panel"} · {dayjs(item.createdAt).format("DD.MM HH:mm")}</Sub>
                </>
              ),
            },
            {
              key: "customer",
              header: "Müşteri",
              render: (item) => (
                <>
                  <Box component="span" sx={{ fontWeight: 700 }}>{customerName(item)}</Box>
                  <Sub>{maskPhone(item.customer?.phone)}{item.customer?.email ? ` · ${item.customer.email}` : ""}</Sub>
                </>
              ),
            },
            {
              key: "vehicle",
              header: "Araç",
              hideBelow: "md",
              render: (item) => (
                <>
                  <Box component="span" sx={{ fontWeight: 600 }}>{item.vehicle?.name || "Araç"}</Box>
                  <Box sx={{ mt: 0.4 }}><Plate value={item.vehicle?.plate || item.licensePlate} size="sm" /></Box>
                </>
              ),
            },
            {
              key: "plan",
              header: "Plan",
              render: (item) => {
                const when = startsIn(item.reservationDate);
                return (
                  <>
                    <Box component="span" sx={{ ...monoSx, fontSize: 13.5 }}>{dayjs(item.reservationDate).format("DD.MM.YYYY")} · {item.reservationTime}</Box>
                    <Sub>{item.rentalDuration || 1} gün · {item.pickupLocation || "Teslim noktası yok"}</Sub>
                    {item.status === "PENDING" && <Box sx={{ mt: 0.5 }}><StatusBadge label={when.text} tone={when.tone} /></Box>}
                  </>
                );
              },
            },
            { key: "amount", header: "Tutar", align: "right", hideBelow: "sm", render: (item) => (item.quotedAmount != null ? <Money value={item.quotedAmount / 100} /> : <Box component="span" sx={{ color: a.subtle }}>—</Box>) },
            {
              key: "note",
              header: "Not",
              hideBelow: "lg",
              width: 180,
              render: (item) => item.note ? (
                <Tooltip title={item.note}>
                  <Typography sx={{ fontSize: 13, color: a.muted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", maxWidth: 180 }}>{item.note}</Typography>
                </Tooltip>
              ) : <Box component="span" sx={{ color: a.subtle }}>—</Box>,
            },
            { key: "status", header: "Durum", render: (item) => <Status value={item.status} /> },
            { key: "actions", header: "", align: "right", width: 140, render: (item) => <RowActions {...actionsFor(item)} /> },
          ]}
          mobileRow={(item) => {
            const when = startsIn(item.reservationDate);
            const actions = actionsFor(item);
            return (
              <Stack spacing={0.75}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box component="span" sx={{ ...monoSx, fontSize: 13 }}>{item.reservationCode || item.id.slice(0, 8)}</Box>
                    <Status value={item.status} />
                  </Stack>
                  {item.quotedAmount != null && <Money value={item.quotedAmount / 100} />}
                </Stack>
                <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{customerName(item)}</Typography>
                <Typography sx={{ fontSize: 12.5, color: a.muted }}>
                  {item.vehicle?.name || item.licensePlate} · {dayjs(item.reservationDate).format("DD MMM")} {item.reservationTime} · {item.rentalDuration || 1} gün
                </Typography>
                {item.status === "PENDING" && (
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 0.5 }}>
                    <StatusBadge label={when.text} tone={when.tone} />
                    <RowActions {...actions} />
                  </Stack>
                )}
              </Stack>
            );
          }}
        />
      </Box>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        danger
        title="Talebi iptal et"
        body={<><strong>{cancelTarget && customerName(cancelTarget)}</strong> adına oluşturulan <Box component="span" sx={monoSx}>{cancelTarget?.reservationCode}</Box> kodlu talep iptal edilecek. Müşteri sorguladığında "İptal edildi" görür.</>}
        confirmLabel="İptal et"
        pendingLabel="İptal ediliyor…"
        pending={action.isPending}
        error={action.isError ? (action.error as any)?.response?.data?.error || "İşlem gerçekleştirilemedi." : undefined}
        onConfirm={() => cancelTarget && action.mutate({ id: cancelTarget.id, type: "cancel" })}
        onClose={() => { setCancelTarget(null); action.reset(); }}
      />
    </>
  );
}
