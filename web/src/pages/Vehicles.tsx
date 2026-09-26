import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from "@mui/material";
import {
  Add as AddIcon,
  ArchiveOutlined,
  BuildOutlined,
  CheckCircleOutline,
  DirectionsCarOutlined,
  EditOutlined,
  GridViewOutlined,
  InfoOutlined,
  PhotoLibraryOutlined,
  RestoreOutlined,
  ViewListOutlined,
} from "@mui/icons-material";
import VehicleFormDialog, { VehicleFormValues, emptyVehicleForm } from "../components/VehicleFormDialog";
import VehicleImagesDialog from "../components/VehicleImagesDialog";
import VehicleDetailDialog from "../components/VehicleDetailDialog";
import { VehicleImage } from "../api/client";
import client from "../api/client";
import { invalidateVehicleCaches } from "../utils/cacheInvalidation";
import { formatCurrency } from "../utils/currency";
import { a, ease, monoSx } from "../admin/theme";
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterTabs,
  PageHeader,
  Plate,
  RowActions,
  SearchField,
  Status,
  StatusBadge,
  Sub,
  Toolbar,
  panelSx,
} from "../admin/ui";

interface Vehicle {
  id: string;
  plate: string;
  name?: string;
  category?: string | null;
  year?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  seats?: number | null;
  dailyRate?: number | null; // kuruş
  description?: string | null;
  imageUrl?: string | null;
  showOnSite?: boolean;
  status?: "IDLE" | "RENTED" | "RESERVED" | "SERVICE";
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  images?: VehicleImage[];
}

type StatusFilter = "ALL" | NonNullable<Vehicle["status"]>;
type ArchiveFilter = "active" | "archived" | "all";
type ViewMode = "grid" | "list";

function vehicleToFormValues(vehicle: Vehicle): VehicleFormValues {
  return {
    plate: vehicle.plate,
    name: vehicle.name || "",
    category: vehicle.category ?? null,
    year: vehicle.year ?? null,
    fuelType: vehicle.fuelType ?? null,
    transmission: vehicle.transmission ?? null,
    seats: vehicle.seats ?? null,
    dailyRateTL: vehicle.dailyRate != null ? vehicle.dailyRate / 100 : null,
    description: vehicle.description ?? null,
    showOnSite: vehicle.showOnSite ?? true,
  };
}

// Form değerlerini API gövdesine çevirir (dailyRateTL backend'de kuruşa çevrilir)
function formValuesToPayload(values: VehicleFormValues) {
  return {
    plate: values.plate.trim().toUpperCase(),
    name: values.name.trim(),
    category: values.category,
    year: values.year,
    fuelType: values.fuelType,
    transmission: values.transmission,
    seats: values.seats,
    dailyRateTL: values.dailyRateTL,
    description: values.description,
    showOnSite: values.showOnSite,
  };
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "IDLE", label: "Müsait" },
  { value: "RENTED", label: "Kirada" },
  { value: "RESERVED", label: "Rezerve" },
  { value: "SERVICE", label: "Serviste" },
];

const VIEW_KEY = "sa-vehicles-view";
const readView = (): ViewMode => {
  try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"; } catch { return "grid"; }
};

const coverOf = (vehicle: Vehicle) =>
  vehicle.images?.find((image) => image.isPrimary)?.imageUrl || vehicle.images?.[0]?.imageUrl || vehicle.imageUrl || null;

const titleCase = (value?: string | null) =>
  value ? value.toLocaleLowerCase("tr-TR").replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase("tr-TR")).replace(/\bSuv\b/, "SUV") : "";

const specsOf = (vehicle: Vehicle) =>
  [titleCase(vehicle.category), titleCase(vehicle.transmission), titleCase(vehicle.fuelType), vehicle.year ? String(vehicle.year) : ""].filter(Boolean).join(" · ");

function Thumb({ vehicle, width = 64, height = 44 }: { vehicle: Vehicle; width?: number; height?: number }) {
  const cover = coverOf(vehicle);
  return (
    <Box sx={{ width, height, borderRadius: "8px", overflow: "hidden", flex: "none", bgcolor: a.surface, display: "grid", placeItems: "center", color: a.subtle }}>
      {cover ? <Box component="img" src={cover} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <DirectionsCarOutlined sx={{ fontSize: 20 }} />}
    </Box>
  );
}

export default function Vehicles() {
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Vehicle | null>(null);
  const [serviceTarget, setServiceTarget] = useState<Vehicle | null>(null);
  const [imagesVehicle, setImagesVehicle] = useState<Vehicle | null>(null);
  const [detailVehicleId, setDetailVehicleId] = useState<string | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>(readView);
  const [errorMessage, setErrorMessage] = useState("");

  const queryClient = useQueryClient();
  const invalidateVehicleQueries = () => invalidateVehicleCaches(queryClient);
  const apiError = (fallback: string) => (error: any) =>
    setErrorMessage(error.response?.data?.error || error.response?.data?.message || error.message || fallback);

  const changeView = (next: ViewMode) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* yoksay */ }
  };

  const { data: vehiclesData, isLoading: vehiclesLoading, error: vehiclesError } = useQuery({
    queryKey: ["vehicles", archiveFilter],
    queryFn: async () => (await client.get(`/vehicles?limit=1000&archived=${archiveFilter}`)).data,
    staleTime: 30 * 1000,
    retry: 3,
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (values: VehicleFormValues) =>
      (await client.post("/vehicles", { ...formValuesToPayload(values), status: "IDLE", active: true, isConsignment: false })).data,
    onSuccess: () => {
      invalidateVehicleQueries();
      setNewVehicleOpen(false);
    },
    onError: apiError("Araç eklenemedi."),
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async (data: { id: string; values: VehicleFormValues }) =>
      (await client.put(`/vehicles/${data.id}`, formValuesToPayload(data.values))).data,
    onSuccess: () => {
      invalidateVehicleQueries();
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["active-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["idle-vehicles"] });
      setEditingVehicle(null);
    },
    onError: apiError("Araç güncellenemedi."),
  });

  // DELETE /vehicles/:id aracı arşivler (geçmiş kayıtlar korunur)
  const archiveVehicleMutation = useMutation({
    mutationFn: async (id: string) => (await client.delete(`/vehicles/${id}`)).data,
    onSuccess: () => {
      invalidateVehicleQueries();
      queryClient.invalidateQueries({ queryKey: ["rentals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setArchiveTarget(null);
    },
    onError: apiError("Araç arşivlenemedi."),
  });

  const vehicleStateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { showOnSite?: boolean; status?: Vehicle["status"] } }) =>
      (await client.patch(`/vehicles/${id}`, data)).data,
    onSuccess: () => {
      invalidateVehicleQueries();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setServiceTarget(null);
    },
    onError: apiError("Araç durumu güncellenemedi. Lütfen tekrar deneyin."),
  });

  const restoreVehicleMutation = useMutation({
    mutationFn: async (id: string) => (await client.post(`/vehicles/${id}/restore`)).data,
    onSuccess: () => {
      invalidateVehicleQueries();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: apiError("Araç arşivden geri yüklenemedi."),
  });

  const vehicles: Vehicle[] = Array.isArray(vehiclesData?.data?.data)
    ? vehiclesData.data.data
    : Array.isArray(vehiclesData?.data)
      ? vehiclesData.data
      : Array.isArray(vehiclesData)
        ? vehiclesData
        : [];

  const searched = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (!query) return vehicles;
    return vehicles.filter((vehicle) =>
      [vehicle.name, vehicle.plate, vehicle.category].filter(Boolean).some((field) => String(field).toLocaleLowerCase("tr-TR").includes(query)),
    );
  }, [vehicles, search]);

  const visible = statusFilter === "ALL" ? searched : searched.filter((vehicle) => (vehicle.status || "IDLE") === statusFilter);
  const counts = useMemo(() => {
    const result: Record<string, number> = { ALL: searched.length };
    for (const vehicle of searched) result[vehicle.status || "IDLE"] = (result[vehicle.status || "IDLE"] || 0) + 1;
    return result;
  }, [searched]);

  const toggleSite = (vehicle: Vehicle) =>
    vehicleStateMutation.mutate({ id: vehicle.id, data: { showOnSite: !vehicle.showOnSite } });

  const actionsFor = (vehicle: Vehicle) => {
    const archived = Boolean(vehicle.archivedAt);
    const canService = !archived && (vehicle.status === "IDLE" || vehicle.status === "SERVICE");
    return [
      { label: "Detayı aç", icon: <InfoOutlined />, onClick: () => setDetailVehicleId(vehicle.id) },
      { label: "Düzenle", icon: <EditOutlined />, onClick: () => setEditingVehicle(vehicle) },
      { label: "Fotoğraflar", icon: <PhotoLibraryOutlined />, onClick: () => setImagesVehicle(vehicle) },
      {
        label: vehicle.status === "SERVICE" ? "Servisten çıkar" : "Servise al",
        icon: vehicle.status === "SERVICE" ? <CheckCircleOutline /> : <BuildOutlined />,
        hidden: !canService,
        onClick: () => setServiceTarget(vehicle),
      },
      { label: "Arşivden geri yükle", icon: <RestoreOutlined />, hidden: !archived, disabled: restoreVehicleMutation.isPending, onClick: () => restoreVehicleMutation.mutate(vehicle.id) },
      { label: "Arşivle", icon: <ArchiveOutlined />, danger: true, hidden: archived, onClick: () => setArchiveTarget(vehicle) },
    ];
  };

  const siteSwitch = (vehicle: Vehicle) => vehicle.archivedAt ? (
    <StatusBadge label="Arşivde" tone="neutral" />
  ) : (
    <Tooltip title={vehicle.showOnSite ? "Sitede görünüyor — gizlemek için kapatın" : "Sitede gizli — yayınlamak için açın"}>
      <Stack direction="row" alignItems="center" spacing={0.5} onClick={(event) => event.stopPropagation()} sx={{ display: "inline-flex" }}>
        <Switch
          size="small"
          checked={Boolean(vehicle.showOnSite)}
          onChange={() => toggleSite(vehicle)}
          disabled={vehicleStateMutation.isPending}
          inputProps={{ "aria-label": `${vehicle.name || vehicle.plate} sitede yayınlansın` }}
        />
        <Typography sx={{ fontSize: 13, color: vehicle.showOnSite ? a.ink : a.subtle, fontWeight: 600 }}>{vehicle.showOnSite ? "Yayında" : "Gizli"}</Typography>
      </Stack>
    </Tooltip>
  );

  return (
    <>
      <PageHeader
        title="Araçlar"
        subtitle={`${vehicles.length} araç · ${vehicles.filter((vehicle) => vehicle.showOnSite && !vehicle.archivedAt).length} tanesi sitede yayında`}
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewVehicleOpen(true)}>Araç ekle</Button>}
      />

      {vehiclesError && <Alert severity="error" sx={{ mb: 2 }}>Araçlar yüklenirken hata oluştu.</Alert>}
      {errorMessage && <Alert severity="error" onClose={() => setErrorMessage("")} sx={{ mb: 2 }}>{errorMessage}</Alert>}

      <Box sx={{ ...panelSx, overflow: "hidden" }}>
        <Toolbar>
          <FilterTabs label="Araç durumu" value={statusFilter} onChange={setStatusFilter} options={STATUS_TABS.map((tab) => ({ ...tab, count: counts[tab.value] || 0 }))} />
          <Box sx={{ flex: 1 }} />
          <SearchField value={search} onChange={setSearch} placeholder="Model, plaka, kategori" sx={{ width: { xs: "100%", sm: 220 } }} />
          <TextField select value={archiveFilter} onChange={(e) => setArchiveFilter(e.target.value as ArchiveFilter)} inputProps={{ "aria-label": "Liste" }} sx={{ width: { xs: "calc(100% - 96px)", sm: 150 } }}>
            <MenuItem value="active">Aktif araçlar</MenuItem>
            <MenuItem value="archived">Arşivdekiler</MenuItem>
            <MenuItem value="all">Tümü</MenuItem>
          </TextField>
          <Box role="radiogroup" aria-label="Görünüm" sx={{ display: "flex", p: 0.5, gap: 0.5, bgcolor: a.surface, borderRadius: "12px" }}>
            {([["grid", "Galeri görünümü", <GridViewOutlined key="g" />], ["list", "Liste görünümü", <ViewListOutlined key="l" />]] as const).map(([mode, label, icon]) => (
              <Tooltip key={mode} title={label}>
                <Box
                  component="button"
                  type="button"
                  role="radio"
                  aria-checked={view === mode}
                  aria-label={label}
                  onClick={() => changeView(mode)}
                  sx={{ width: 34, height: 34, border: 0, borderRadius: "9px", cursor: "pointer", display: "grid", placeItems: "center", color: view === mode ? a.ink : a.subtle, bgcolor: view === mode ? a.raised : "transparent", boxShadow: view === mode ? "0 1px 2px rgba(30,20,22,.08)" : "none", "& svg": { fontSize: 19 } }}
                >
                  {icon}
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Toolbar>

        {view === "list" ? (
          <DataTable
            rows={visible}
            rowKey={(vehicle) => vehicle.id}
            loading={vehiclesLoading}
            onRowClick={(vehicle) => setDetailVehicleId(vehicle.id)}
            empty={<EmptyState icon={<DirectionsCarOutlined />} title={search || statusFilter !== "ALL" ? "Bu filtrede araç yok" : "Henüz araç eklenmemiş"} />}
            columns={[
              {
                key: "vehicle",
                header: "Araç",
                render: (vehicle) => (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Thumb vehicle={vehicle} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: 14 }}>{vehicle.name || "Model belirtilmemiş"}</Typography>
                      <Box sx={{ mt: 0.4 }}><Plate value={vehicle.plate} size="sm" /></Box>
                    </Box>
                  </Stack>
                ),
              },
              { key: "specs", header: "Özellikler", hideBelow: "lg", render: (vehicle) => <Typography sx={{ fontSize: 13, color: a.muted }}>{specsOf(vehicle) || "—"}</Typography> },
              {
                key: "rate",
                header: "Günlük",
                align: "right",
                hideBelow: "sm",
                render: (vehicle) => vehicle.dailyRate != null
                  ? <Box component="span" sx={{ ...monoSx, fontWeight: 500 }}>{formatCurrency(vehicle.dailyRate / 100)}</Box>
                  : <Box component="span" sx={{ color: a.subtle, fontSize: 13 }}>Girilmemiş</Box>,
              },
              { key: "status", header: "Durum", render: (vehicle) => <Status value={vehicle.status || "IDLE"} /> },
              { key: "site", header: "Sitede", hideBelow: "md", render: siteSwitch },
              {
                key: "photos",
                header: "Fotoğraf",
                hideBelow: "lg",
                render: (vehicle) => (
                  <>
                    <Box component="span" sx={{ ...monoSx, fontSize: 13 }}>{vehicle.images?.length || 0}</Box>
                    <Sub>{vehicle.updatedAt || vehicle.createdAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(new Date(vehicle.updatedAt || vehicle.createdAt!)) : "—"}</Sub>
                  </>
                ),
              },
              { key: "actions", header: "", align: "right", width: 56, render: (vehicle) => <RowActions items={actionsFor(vehicle)} /> },
            ]}
            mobileRow={(vehicle) => (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Thumb vehicle={vehicle} width={72} height={50} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 700, fontSize: 14.5 }}>{vehicle.name || vehicle.plate}</Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
                    <Plate value={vehicle.plate} size="sm" />
                    <Status value={vehicle.status || "IDLE"} />
                  </Stack>
                </Box>
                <RowActions items={actionsFor(vehicle)} />
              </Stack>
            )}
          />
        ) : vehiclesLoading ? (
          <Box sx={{ p: 2.5, display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {[0, 1, 2, 3].map((i) => <Box key={i} sx={{ aspectRatio: "4 / 3.4", borderRadius: "12px", bgcolor: a.surface }} />)}
          </Box>
        ) : visible.length === 0 ? (
          <EmptyState icon={<DirectionsCarOutlined />} title={search || statusFilter !== "ALL" ? "Bu filtrede araç yok" : "Henüz araç eklenmemiş"} />
        ) : (
          <Box sx={{ p: { xs: 2, md: 2.5 }, display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(auto-fill, minmax(250px, 1fr))" } }}>
            {visible.map((vehicle) => {
              const cover = coverOf(vehicle);
              return (
                <Box
                  key={vehicle.id}
                  component="article"
                  onClick={() => setDetailVehicleId(vehicle.id)}
                  sx={{
                    border: `1px solid ${a.lineSoft}`,
                    borderRadius: "12px",
                    overflow: "hidden",
                    bgcolor: a.raised,
                    cursor: "pointer",
                    opacity: vehicle.archivedAt ? 0.7 : 1,
                    transition: `border-color .15s ease, box-shadow .2s ease, transform .25s ${ease}`,
                    "@media (hover: hover)": { "&:hover": { borderColor: a.line, boxShadow: a.shadowPop, transform: "translateY(-2px)" } },
                  }}
                >
                  <Box sx={{ position: "relative", aspectRatio: "16 / 10", bgcolor: a.surface, display: "grid", placeItems: "center", color: a.subtle }}>
                    {cover ? <Box component="img" src={cover} alt="" loading="lazy" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : (
                      <Stack alignItems="center" spacing={0.5}><PhotoLibraryOutlined /><Typography sx={{ fontSize: 12, fontWeight: 600 }}>Fotoğraf yok</Typography></Stack>
                    )}
                    <Box sx={{ position: "absolute", top: 10, left: 10 }}><Status value={vehicle.status || "IDLE"} /></Box>
                  </Box>
                  <Box sx={{ p: 1.75, display: "grid", gap: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 800, fontSize: 15.5, letterSpacing: "-0.015em" }}>{vehicle.name || "Model belirtilmemiş"}</Typography>
                        <Typography noWrap sx={{ fontSize: 12.5, color: a.muted, mt: 0.25 }}>{specsOf(vehicle) || "Özellik girilmemiş"}</Typography>
                      </Box>
                      <Box sx={{ mr: -0.75, mt: -0.5 }}><RowActions items={actionsFor(vehicle)} /></Box>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Plate value={vehicle.plate} size="sm" />
                      {vehicle.dailyRate != null && (
                        <Typography sx={{ ...monoSx, fontSize: 13.5, fontWeight: 500 }}>
                          {formatCurrency(vehicle.dailyRate / 100)}<Box component="span" sx={{ color: a.subtle, fontFamily: "inherit", fontSize: 12 }}>/gün</Box>
                        </Typography>
                      )}
                    </Stack>
                    <Box sx={{ pt: 1, borderTop: `1px solid ${a.lineSoft}` }}>{siteSwitch(vehicle)}</Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <VehicleFormDialog
        open={newVehicleOpen}
        title="Yeni araç ekle"
        initialValues={emptyVehicleForm}
        submitLabel="Ekle"
        pending={createVehicleMutation.isPending}
        onClose={() => setNewVehicleOpen(false)}
        onSubmit={(values) => createVehicleMutation.mutate(values)}
      />

      <VehicleFormDialog
        open={Boolean(editingVehicle)}
        title="Aracı düzenle"
        initialValues={editingVehicle ? vehicleToFormValues(editingVehicle) : emptyVehicleForm}
        submitLabel="Güncelle"
        pending={updateVehicleMutation.isPending}
        onClose={() => setEditingVehicle(null)}
        onSubmit={(values) => editingVehicle && updateVehicleMutation.mutate({ id: editingVehicle.id, values })}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        danger
        title="Aracı arşivle"
        body={<><strong>{archiveTarget?.plate} · {archiveTarget?.name}</strong> siteden kaldırılır ve yeni rezervasyonlara kapanır. Geçmiş kiralama ve rapor kayıtları korunur; dilediğinizde arşivden geri yükleyebilirsiniz.</>}
        confirmLabel="Arşivle"
        pendingLabel="Arşivleniyor…"
        pending={archiveVehicleMutation.isPending}
        onConfirm={() => archiveTarget && archiveVehicleMutation.mutate(archiveTarget.id)}
        onClose={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(serviceTarget)}
        title={serviceTarget?.status === "SERVICE" ? "Servisten çıkar" : "Servise al"}
        body={serviceTarget?.status === "SERVICE"
          ? <><strong>{serviceTarget?.plate}</strong> servisten çıkarılıp müsait duruma alınacak.</>
          : <><strong>{serviceTarget?.plate}</strong> servise alınacak ve rezervasyona kapatılacak.</>}
        confirmLabel={serviceTarget?.status === "SERVICE" ? "Müsait yap" : "Servise al"}
        pending={vehicleStateMutation.isPending}
        onConfirm={() => serviceTarget && vehicleStateMutation.mutate({ id: serviceTarget.id, data: { status: serviceTarget.status === "SERVICE" ? "IDLE" : "SERVICE" } })}
        onClose={() => setServiceTarget(null)}
      />

      <VehicleImagesDialog
        open={Boolean(imagesVehicle)}
        vehicle={imagesVehicle}
        onClose={() => setImagesVehicle(null)}
        onChanged={invalidateVehicleQueries}
      />
      <VehicleDetailDialog
        open={Boolean(detailVehicleId)}
        vehicleId={detailVehicleId}
        onClose={() => setDetailVehicleId(null)}
      />
    </>
  );
}
