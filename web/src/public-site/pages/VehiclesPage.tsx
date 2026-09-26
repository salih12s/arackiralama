import { ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Close, DirectionsCar, FilterAltOff, Search, Tune } from "@mui/icons-material";
import { publicApi } from "../api/client";
import { site } from "../config";
import { ease, fonts, t } from "../theme";
import { formatDate, formatSpec, setPageMeta } from "../utils/format";
import SearchForm, {
  SearchValues,
  searchValuesToParams,
} from "../components/SearchForm";
import VehicleCard, {
  VehicleCardSkeleton,
} from "../components/VehicleCard";
import { EmptyState, PageHeader, headerBandSx } from "../components/common";

interface Filters {
  category: string;
  transmission: string;
  fuelType: string;
  seats: string;
  minPrice: string;
  maxPrice: string;
  onlyAvailable: boolean;
  q: string;
}

const emptyFilters: Filters = {
  category: "",
  transmission: "",
  fuelType: "",
  seats: "",
  minPrice: "",
  maxPrice: "",
  onlyAvailable: false,
  q: "",
};

type SortKey = "recommended" | "priceAsc" | "priceDesc";

const TRANSMISSIONS = ["OTOMATİK", "MANUEL"];
const FUELS = ["BENZİN", "DİZEL", "HİBRİT", "ELEKTRİK", "LPG"];
const SEATS = ["4", "5", "7"];

/** Tek seçimli hap düğmeler; tekrar tıklayınca seçim kalkar. */
function ChipGroup({ label, value, options, onChange, format = formatSpec }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  format?: (value: string) => string;
}) {
  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Box component="legend" sx={{ p: 0, mb: 1, fontSize: 13, fontWeight: 700, color: t.ink }}>{label}</Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Box
              key={option}
              component="button"
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? "" : option)}
              sx={{
                cursor: "pointer",
                font: `600 14px ${fonts.sans}`,
                minHeight: 36,
                px: 1.6,
                borderRadius: 999,
                border: `1px solid ${selected ? t.accentFill : t.line}`,
                bgcolor: selected ? t.accentFill : t.raised,
                color: selected ? t.onAccent : t.ink,
                transition: `background-color .15s ease, border-color .15s ease, color .15s ease, transform .16s ${ease}`,
                "&:active": { transform: "scale(0.96)" },
                "@media (hover: hover)": { "&:hover": { borderColor: selected ? t.accentFill : t.muted } },
              }}
            >
              {format(option)}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function FilterPanel({ filters, categories, update, onClear, activeCount }: {
  filters: Filters;
  categories: string[];
  update: <K extends keyof Filters>(field: K, value: Filters[K]) => void;
  onClear: () => void;
  activeCount: number;
}) {
  return (
    <Stack spacing={3}>
      <TextField
        label="Marka / model ara"
        value={filters.q}
        onChange={(e) => update("q", e.target.value)}
        fullWidth
        InputProps={{ startAdornment: <Search sx={{ color: t.subtle, mr: 1, fontSize: 20 }} /> }}
      />
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
        <Box component="label" htmlFor="only-available" sx={{ fontSize: 14.5, fontWeight: 700, color: t.ink, cursor: "pointer" }}>
          Sadece müsait araçlar
        </Box>
        <Switch
          id="only-available"
          checked={filters.onlyAvailable}
          onChange={(e) => update("onlyAvailable", e.target.checked)}
        />
      </Stack>
      {categories.length > 0 && (
        <ChipGroup label="Kategori" value={filters.category} options={categories} onChange={(value) => update("category", value)} />
      )}
      <ChipGroup label="Vites" value={filters.transmission} options={TRANSMISSIONS} onChange={(value) => update("transmission", value)} />
      <ChipGroup label="Yakıt" value={filters.fuelType} options={FUELS} onChange={(value) => update("fuelType", value)} />
      <ChipGroup label="Koltuk" value={filters.seats} options={SEATS} onChange={(value) => update("seats", value)} format={(value) => `${value} kişi`} />
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <Box component="legend" sx={{ p: 0, mb: 1, fontSize: 13, fontWeight: 700, color: t.ink }}>Günlük fiyat (₺)</Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            placeholder="En az"
            type="number"
            value={filters.minPrice}
            onChange={(e) => update("minPrice", e.target.value)}
            inputProps={{ min: 0, inputMode: "numeric", "aria-label": "En az günlük fiyat" }}
          />
          <Box aria-hidden sx={{ color: t.subtle }}>–</Box>
          <TextField
            placeholder="En çok"
            type="number"
            value={filters.maxPrice}
            onChange={(e) => update("maxPrice", e.target.value)}
            inputProps={{ min: 0, inputMode: "numeric", "aria-label": "En çok günlük fiyat" }}
          />
        </Stack>
      </Box>
      {activeCount > 0 && (
        <Button onClick={onClear} startIcon={<FilterAltOff />} variant="outlined" sx={{ alignSelf: "flex-start" }}>
          Filtreleri temizle ({activeCount})
        </Button>
      )}
    </Stack>
  );
}

export default function VehiclesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";
  const hasRange = Boolean(start && end);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("recommended");

  const [filters, setFilters] = useState<Filters>({
    ...emptyFilters,
    category: searchParams.get("kategori") || "",
    q: searchParams.get("q") || "",
  });

  useEffect(() => {
    setPageMeta(
      `Araçlar — ${site.brandName}`,
      "SS Filo araç filosu: tarihlerinize göre gerçek müsaitlik, şeffaf günlük fiyatlar.",
    );
  }, []);

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", start, end],
    queryFn: () => publicApi.getVehicles(hasRange ? { start, end } : undefined),
    staleTime: 30_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => publicApi.getCategories(),
    staleTime: 300_000,
  });

  const vehicles = vehiclesQuery.data?.data.data || [];
  const categories = categoriesQuery.data?.data.data || [];

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLocaleLowerCase("tr-TR");
    const list = vehicles.filter((vehicle) => {
      if (filters.category && vehicle.category !== filters.category) return false;
      if (filters.transmission && vehicle.transmission !== filters.transmission) return false;
      if (filters.fuelType && vehicle.fuelType !== filters.fuelType) return false;
      if (filters.seats && String(vehicle.seats ?? "") !== filters.seats) return false;
      if (filters.minPrice && (vehicle.dailyRate == null || vehicle.dailyRate < Number(filters.minPrice))) return false;
      if (filters.maxPrice && (vehicle.dailyRate == null || vehicle.dailyRate > Number(filters.maxPrice))) return false;
      if (filters.onlyAvailable && !vehicle.available) return false;
      if (q && !`${vehicle.name} ${vehicle.category ?? ""}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
      return true;
    });
    if (sort === "recommended") {
      // Müsait araçlar önce; kendi içinde API sırası korunur.
      return [...list].sort((a, b) => Number(b.available) - Number(a.available));
    }
    const direction = sort === "priceAsc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (a.dailyRate == null) return 1;
      if (b.dailyRate == null) return -1;
      return (a.dailyRate - b.dailyRate) * direction;
    });
  }, [vehicles, filters, sort]);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) =>
    key === "onlyAvailable" ? value === true : value !== "",
  ).length;

  const update = <K extends keyof Filters>(field: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [field]: value }));

  const pickupTime = searchParams.get("pickupTime") || "10:00";
  const returnTime = searchParams.get("returnTime") || pickupTime;
  const pickup = searchParams.get("pickup");
  const dateParams = hasRange
    ? `start=${start}&end=${end}${searchParams.get("pickupTime") ? `&pickupTime=${pickupTime}` : ""}${pickup ? `&pickup=${encodeURIComponent(pickup)}` : ""}`
    : "";

  const handleSearch = (values: SearchValues) => {
    setSearchParams(searchValuesToParams(values));
    if (values.q) update("q", values.q);
  };

  const panel = (
    <FilterPanel
      filters={filters}
      categories={categories}
      update={update}
      onClear={() => setFilters(emptyFilters)}
      activeCount={activeFilterCount}
    />
  );

  let summary: ReactNode = "Tarih seçerek o günlerde gerçekten müsait araçları ve toplam fiyatı görün.";
  if (hasRange) {
    summary = (
      <>
        <Box component="span" sx={{ color: t.ink, fontWeight: 700 }}>{formatDate(start)}</Box>
        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: "0.92em" }}> {pickupTime}</Box>
        {"  →  "}
        <Box component="span" sx={{ color: t.ink, fontWeight: 700 }}>{formatDate(end)}</Box>
        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: "0.92em" }}> {returnTime}</Box>
        {pickup ? ` · ${pickup}` : ""}
      </>
    );
  }

  return (
    <>
      <Box component="section" sx={headerBandSx}>
        <Container maxWidth="lg">
          <PageHeader
            crumbs={[{ label: "Ana sayfa", to: "/" }, { label: "Araçlar" }]}
            title="Araç filosu"
            subtitle={summary}
          >
            <SearchForm
              submitLabel="Ara"
              initial={{
                start: start || undefined,
                end: end || undefined,
                pickupTime: searchParams.get("pickupTime") || undefined,
                returnTime: searchParams.get("returnTime") || undefined,
                pickup: pickup || undefined,
              }}
              onSubmit={handleSearch}
            />
          </PageHeader>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ display: "grid", gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "260px minmax(0, 1fr)" }, alignItems: "start" }}>
          {/* Masaüstü: yan filtre paneli */}
          <Box component="aside" aria-label="Filtreler" sx={{ display: { xs: "none", md: "block" }, position: "sticky", top: 92 }}>
            <Typography sx={{ fontWeight: 800, color: t.ink, fontSize: 17, mb: 2.5 }}>Filtreler</Typography>
            {panel}
          </Box>

          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ mb: 3, pb: 2, borderBottom: `1px solid ${t.line}` }}>
              <Typography aria-live="polite" sx={{ color: t.muted, fontSize: 15 }}>
                {vehiclesQuery.isLoading ? "Araçlar yükleniyor…" : (
                  <>
                    <Box component="span" sx={{ fontFamily: fonts.mono, color: t.ink, fontWeight: 500 }}>{filtered.length}</Box> araç
                    {filtered.length !== vehicles.length && <> / {vehicles.length}</>}
                  </>
                )}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  inputProps={{ "aria-label": "Sıralama" }}
                  sx={{ minWidth: { xs: 0, sm: 190 }, "& .MuiSelect-select": { fontSize: 14.5, fontWeight: 600 } }}
                >
                  <MenuItem value="recommended">Önerilen</MenuItem>
                  <MenuItem value="priceAsc">Fiyat: artan</MenuItem>
                  <MenuItem value="priceDesc">Fiyat: azalan</MenuItem>
                </TextField>
                <Badge badgeContent={activeFilterCount} color="primary" sx={{ display: { md: "none" } }}>
                  <Button variant="outlined" startIcon={<Tune />} onClick={() => setFiltersOpen(true)} sx={{ minHeight: 40 }}>
                    Filtrele
                  </Button>
                </Badge>
              </Stack>
            </Stack>

            {vehiclesQuery.isError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Araçlar yüklenemedi. Lütfen sayfayı yenileyin veya bizi arayın.
              </Alert>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                columnGap: { xs: 2.5, md: 3 },
                rowGap: { xs: 5, md: 6 },
                "@media (min-width:640px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
              }}
            >
              {vehiclesQuery.isLoading && Array.from({ length: 4 }).map((_, i) => <VehicleCardSkeleton key={i} />)}
              {filtered.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} dateParams={dateParams} />
              ))}
            </Box>
            {!vehiclesQuery.isLoading && !vehiclesQuery.isError && filtered.length === 0 && (
              <Box sx={{ display: "grid", gap: 2, justifyItems: "center" }}>
                <EmptyState
                  icon={<DirectionsCar />}
                  title="Bu kriterlere uygun araç bulunamadı"
                  subtitle="Filtreleri gevşetmeyi veya farklı tarihler seçmeyi deneyin."
                />
                {activeFilterCount > 0 && (
                  <Button variant="outlined" startIcon={<FilterAltOff />} onClick={() => setFilters(emptyFilters)}>
                    Filtreleri temizle
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Container>

      {/* Mobil: alttan açılan filtre çekmecesi */}
      <Drawer
        anchor="bottom"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        PaperProps={{ sx: { borderRadius: "22px 22px 0 0", maxHeight: "88dvh", display: "flex", flexDirection: "column" } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${t.lineSoft}` }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, color: t.ink }}>Filtreler</Typography>
          <IconButton onClick={() => setFiltersOpen(false)} aria-label="Filtreleri kapat"><Close /></IconButton>
        </Stack>
        <Box sx={{ px: 2.5, py: 2.5, overflowY: "auto", overscrollBehavior: "contain" }}>{panel}</Box>
        <Box sx={{ px: 2.5, pt: 1.5, pb: "calc(16px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${t.lineSoft}` }}>
          <Button fullWidth variant="contained" size="large" onClick={() => setFiltersOpen(false)}>
            {filtered.length} aracı göster
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
