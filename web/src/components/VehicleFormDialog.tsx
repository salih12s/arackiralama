import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

export const FUEL_TYPES = ['BENZİN', 'DİZEL', 'HİBRİT', 'ELEKTRİK', 'LPG'];
export const TRANSMISSIONS = ['MANUEL', 'OTOMATİK'];
export const VEHICLE_CATEGORIES = ['EKONOMİK', 'KONFOR', 'PREMIUM', 'SUV'];

export interface VehicleFormValues {
  plate: string;
  name: string;
  category: string | null;
  year: number | null;
  fuelType: string | null;
  transmission: string | null;
  seats: number | null;
  dailyRateTL: number | null;
  description: string | null;
  showOnSite: boolean;
}

export const emptyVehicleForm: VehicleFormValues = {
  plate: '',
  name: '',
  category: null,
  year: null,
  fuelType: null,
  transmission: null,
  seats: null,
  dailyRateTL: null,
  description: null,
  showOnSite: true,
};

interface VehicleFormDialogProps {
  open: boolean;
  title: string;
  initialValues: VehicleFormValues;
  submitLabel: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: VehicleFormValues) => void;
}

export default function VehicleFormDialog({
  open,
  title,
  initialValues,
  submitLabel,
  pending,
  onClose,
  onSubmit,
}: VehicleFormDialogProps) {
  const [values, setValues] = useState<VehicleFormValues>(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [open, initialValues]);

  const update = <K extends keyof VehicleFormValues>(field: K, value: VehicleFormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));

  const canSubmit = values.plate.trim().length > 0 && values.name.trim().length > 0 && !pending;

  return (
    <Dialog open={open} onClose={() => !pending && onClose()} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              autoFocus
              label="Plaka"
              fullWidth
              required
              value={values.plate}
              onChange={(e) => update('plate', e.target.value.toUpperCase())}
              placeholder="Örn: 34 ABC 123"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Marka / Model"
              fullWidth
              required
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Örn: Renault Clio"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                KİRALAMA SİTESİ VİTRİN BİLGİLERİ
              </Typography>
            </Divider>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Vitrin kategorisi"
              fullWidth
              value={values.category ?? ''}
              onChange={(e) => update('category', e.target.value || null)}
              helperText="Public filtrelerinde kullanılır"
            >
              <MenuItem value="">Seçilmedi</MenuItem>
              {VEHICLE_CATEGORIES.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
            </TextField>
          </Grid>

          <Grid item xs={6} sm={2}>
            <TextField
              label="Model Yılı"
              type="number"
              fullWidth
              value={values.year ?? ''}
              onChange={(e) => update('year', e.target.value ? Number(e.target.value) : null)}
              inputProps={{ min: 1980, max: 2100 }}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              select
              label="Yakıt"
              fullWidth
              value={values.fuelType ?? ''}
              onChange={(e) => update('fuelType', e.target.value || null)}
            >
              <MenuItem value="">Seçilmedi</MenuItem>
              {FUEL_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              select
              label="Vites"
              fullWidth
              value={values.transmission ?? ''}
              onChange={(e) => update('transmission', e.target.value || null)}
            >
              <MenuItem value="">Seçilmedi</MenuItem>
              {TRANSMISSIONS.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              label="Koltuk"
              type="number"
              fullWidth
              value={values.seats ?? ''}
              onChange={(e) => update('seats', e.target.value ? Number(e.target.value) : null)}
              inputProps={{ min: 1, max: 20 }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Günlük Fiyat (TL)"
              type="number"
              fullWidth
              value={values.dailyRateTL ?? ''}
              onChange={(e) => update('dailyRateTL', e.target.value ? Number(e.target.value) : null)}
              inputProps={{ min: 0, step: 50 }}
              helperText="Sitede vitrin fiyatı olarak gösterilir"
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              label="Vitrin Açıklaması"
              fullWidth
              multiline
              minRows={2}
              value={values.description ?? ''}
              onChange={(e) => update('description', e.target.value || null)}
              placeholder="Örn: Şehir içi kullanım için ekonomik, bakımları tam, geniş bagaj hacmi..."
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">Fotoğraf yönetimi ayrı galeri panelinden yapılır. Burada yalnızca public başlık, açıklama, kategori, fiyat ve yayın durumu düzenlenir.</Typography>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={values.showOnSite}
                  onChange={(e) => update('showOnSite', e.target.checked)}
                />
              }
              label="Kiralama sitesinde göster"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={pending}>İptal</Button>
        <Button variant="contained" onClick={() => onSubmit(values)} disabled={!canSubmit}>
          {pending ? 'Kaydediliyor...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
