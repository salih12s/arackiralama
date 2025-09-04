import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { vehiclesApi } from '../api/client';

const vehicleSchema = z.object({
  plate: z.string().min(1, 'Plaka gereklidir'),
  name: z.string().optional(),
  status: z.enum(['IDLE', 'RENTED', 'RESERVED', 'SERVICE']).default('IDLE'),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface NewVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewVehicleDialog({ open, onClose, onSuccess }: NewVehicleDialogProps) {
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: '',
      name: '',
      status: 'IDLE',
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data: VehicleFormData) => vehiclesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['all-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
      reset();
      onClose();
    },
  });

  const onSubmit = (data: VehicleFormData) => {
    createVehicleMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Yeni Araç Ekle</DialogTitle>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="plate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Plaka"
                    fullWidth
                    error={!!errors.plate}
                    helperText={errors.plate?.message}
                    placeholder="34 ABC 123"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Durum</InputLabel>
                    <Select {...field} label="Durum">
                      <MenuItem value="IDLE">Boşta</MenuItem>
                      <MenuItem value="RENTED">Kirada</MenuItem>
                      <MenuItem value="RESERVED">Rezerve</MenuItem>
                      <MenuItem value="SERVICE">Serviste</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Araç Adı (Opsiyonel)"
                    fullWidth
                    placeholder="Volkswagen Passat, Honda Civic vs."
                  />
                )}
              />
            </Grid>
          </Grid>

          {createVehicleMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Araç eklenirken bir hata oluştu.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={createVehicleMutation.isPending}>
            İptal
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={createVehicleMutation.isPending}
          >
            {createVehicleMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
