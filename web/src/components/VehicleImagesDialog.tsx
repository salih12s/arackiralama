import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { AddPhotoAlternate, ArrowDownward, ArrowUpward, Delete, Link as LinkIcon, Star, StarBorder } from '@mui/icons-material';
import { Vehicle, VehicleImage, vehiclesApi } from '../api/client';
import { invalidateVehicleCaches } from '../utils/cacheInvalidation';

interface VehicleImagesDialogProps {
  open: boolean;
  vehicle: Pick<Vehicle, 'id' | 'name' | 'plate' | 'images'> | null;
  onClose: () => void;
  onChanged?: () => void;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export default function VehicleImagesDialog({ open, vehicle, onClose, onChanged }: VehicleImagesDialogProps) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState('');
  const [urlAlt, setUrlAlt] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const vehicleQuery = useQuery({ queryKey: ['vehicle', vehicle?.id], queryFn: () => vehiclesApi.getById(vehicle!.id), enabled: open && Boolean(vehicle?.id) });
  const images = useMemo(() => (vehicleQuery.data?.data.images || vehicle?.images || []).slice().sort((a, b) => (a.isPrimary ? -1 : 1) - (b.isPrimary ? -1 : 1) || a.sortOrder - b.sortOrder), [vehicleQuery.data?.data.images, vehicle?.images]);

  useEffect(() => { if (open) { setFiles([]); setError(''); setProgress(0); setUrl(''); setUrlAlt(''); } }, [open, vehicle?.id]);

  const invalidate = () => {
    invalidateVehicleCaches(queryClient);
    queryClient.invalidateQueries({ queryKey: ['vehicle', vehicle?.id] });
    onChanged?.();
  };

  const addFiles = (incoming: File[]) => {
    const invalid = incoming.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_FILE_BYTES);
    if (invalid) { setError(`${invalid.name}: yalnızca JPG, PNG, WebP ve en fazla 8 MB kabul edilir.`); return; }
    setError('');
    setFiles((current) => [...current, ...incoming]);
  };

  const upload = useMutation({ mutationFn: () => vehiclesApi.uploadImages(vehicle!.id, files, setProgress), onSuccess: () => { setFiles([]); setProgress(0); invalidate(); }, onError: (reason: any) => setError(reason?.response?.data?.error || 'Görseller yüklenemedi. Dosyalar tekrar denenebilir.') });
  const addUrl = useMutation({ mutationFn: () => vehiclesApi.addImageUrl(vehicle!.id, url.trim(), urlAlt.trim() || undefined), onSuccess: () => { setUrl(''); setUrlAlt(''); invalidate(); }, onError: (reason: any) => setError(reason?.response?.data?.error || 'Görsel URL eklenemedi.') });
  const imageAction = useMutation({
    mutationFn: ({ type, image }: { type: 'primary' | 'delete' | 'move'; image: VehicleImage }) => {
      if (type === 'primary') return vehiclesApi.setPrimaryImage(vehicle!.id, image.id);
      if (type === 'delete') return vehiclesApi.deleteImage(vehicle!.id, image.id);
      const index = images.findIndex((item) => item.id === image.id);
      const nextIndex = Math.max(0, Math.min(images.length - 1, index + (image.sortOrder < 0 ? -1 : 1)));
      const ids = images.map((item) => item.id); [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
      return vehiclesApi.reorderImages(vehicle!.id, ids);
    },
    onSuccess: invalidate,
    onError: (reason: any) => setError(reason?.response?.data?.error || 'Görsel işlemi başarısız.')
  });

  const move = (image: VehicleImage, direction: -1 | 1) => {
    const index = images.findIndex((item) => item.id === image.id);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const ids = images.map((item) => item.id); [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    vehiclesApi.reorderImages(vehicle!.id, ids).then(invalidate).catch(() => setError('Görsel sıralaması güncellenemedi.'));
  };

  return <Dialog open={open} onClose={upload.isPending ? undefined : onClose} maxWidth="md" fullWidth>
    <DialogTitle>Fotoğraflar · {vehicle?.name || vehicle?.plate}</DialogTitle>
    <DialogContent dividers>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Paper variant="outlined" onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(event) => { event.preventDefault(); setDragOver(false); addFiles(Array.from(event.dataTransfer.files)); }} sx={{ p: 2.5, textAlign: 'center', borderStyle: 'dashed', bgcolor: dragOver ? 'action.hover' : 'transparent' }}>
        <AddPhotoAlternate sx={{ fontSize: 32, color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">JPG, PNG veya WebP dosyalarını buraya bırakın</Typography>
        <Button component="label" variant="outlined" sx={{ mt: 1 }}>Dosya Seç<input hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} /></Button>
      </Paper>
      {files.length > 0 && <Stack spacing={.75} sx={{ mt: 1.5 }}><Typography variant="caption" fontWeight={700}>{files.length} dosya hazır</Typography>{files.map((file) => <Stack key={`${file.name}-${file.lastModified}`} direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2" noWrap>{file.name}</Typography><IconButton size="small" onClick={() => setFiles((current) => current.filter((item) => item !== file))}><Delete fontSize="small" /></IconButton></Stack>)}<Button variant="contained" onClick={() => upload.mutate()} disabled={upload.isPending}>{upload.isPending ? 'Yükleniyor...' : 'Görselleri Yükle'}</Button>{upload.isPending && <LinearProgress variant="determinate" value={progress} />}</Stack>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}><TextField size="small" fullWidth label="Harici görsel URL" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://.../arac.webp" /><TextField size="small" label="Alt metin" value={urlAlt} onChange={(event) => setUrlAlt(event.target.value)} /><Button variant="outlined" startIcon={<LinkIcon />} disabled={!url.trim() || addUrl.isPending} onClick={() => addUrl.mutate()}>URL Ekle</Button></Stack>

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Galeri ({images.length})</Typography>
      <Stack spacing={1}>{images.map((image, index) => <Paper key={image.id} variant="outlined" sx={{ p: 1, display: 'flex', gap: 1.25, alignItems: 'center' }}><Box component="img" src={image.imageUrl} alt={image.altText || ''} sx={{ width: 88, height: 62, objectFit: 'cover', borderRadius: 1 }} /><Box sx={{ flex: 1, minWidth: 0 }}><TextField size="small" fullWidth label="Alt metin" defaultValue={image.altText || ''} onBlur={(event) => { const next = event.target.value.trim(); if (next !== (image.altText || '')) vehiclesApi.updateImage(vehicle!.id, image.id, { altText: next || null }).then(invalidate).catch(() => setError('Alt metin güncellenemedi.')); }} /><Stack direction="row" spacing={.5} sx={{ mt: .5 }}><Button size="small" startIcon={image.isPrimary ? <Star /> : <StarBorder />} onClick={() => imageAction.mutate({ type: 'primary', image })} disabled={image.isPrimary}>Ana fotoğraf</Button><IconButton size="small" disabled={index === 0} onClick={() => move(image, -1)}><ArrowUpward fontSize="small" /></IconButton><IconButton size="small" disabled={index === images.length - 1} onClick={() => move(image, 1)}><ArrowDownward fontSize="small" /></IconButton><IconButton size="small" color="error" onClick={() => imageAction.mutate({ type: 'delete', image })}><Delete fontSize="small" /></IconButton></Stack></Box></Paper>)}</Stack>
      {vehicleQuery.isFetching && <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}><CircularProgress size={16} /><Typography variant="caption">Galeri yenileniyor...</Typography></Stack>}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Kapat</Button></DialogActions>
  </Dialog>;
}
