import { Link as RouterLink } from 'react-router-dom';
import { a } from '../admin/theme';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close,
  DirectionsCar,
  Edit,
  OpenInNew,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { Rental } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { formatDate, formatDateTime } from '../utils/format';
import { getStatusColor, getStatusText } from '../utils/status';
import { getDisplayNote, getRentalFinancials } from '../utils/rentalFinancials';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Nakit',
  TRANSFER: 'Havale',
  CARD: 'Kart',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{ display: 'block', mb: 1, fontWeight: 800, letterSpacing: '.08em', color: 'text.secondary' }}
    >
      {children}
    </Typography>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.45 }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', color: valueColor }}>
        {value}
      </Typography>
    </Stack>
  );
}

interface RentalDetailDialogProps {
  open: boolean;
  rental: Rental | null;
  onClose: () => void;
  onEdit: (rental: Rental) => void;
  onAddPayment: (rental: Rental) => void;
  onComplete: (rental: Rental) => void;
}

export default function RentalDetailDialog({
  open,
  rental,
  onClose,
  onEdit,
  onAddPayment,
  onComplete,
}: RentalDetailDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  if (!rental) return null;

  const fin = getRentalFinancials(rental);
  const displayNote = getDisplayNote(rental.note);

  // Yalnızca gerçekten girilmiş taksit/peşin kayıtlarını listele
  const installmentRows = [
    { label: 'Peşin ödeme', amount: rental.upfront, date: undefined },
    { label: '1. taksit', amount: rental.pay1, date: rental.payDate1 },
    { label: '2. taksit', amount: rental.pay2, date: rental.payDate2 },
    { label: '3. taksit', amount: rental.pay3, date: rental.payDate3 },
    { label: '4. taksit', amount: rental.pay4, date: rental.payDate4 },
  ].filter((row) => (row.amount || 0) > 0);

  const extraRows = [
    { label: 'Kilometre farkı', amount: fin.extras.kmDiff },
    { label: 'HGS', amount: fin.extras.hgs },
    { label: 'Temizlik', amount: fin.extras.cleaning },
    { label: 'Hasar', amount: fin.extras.damage },
    { label: 'Yakıt', amount: fin.extras.fuel },
  ].filter((row) => row.amount > 0);

  const balanceColor =
    fin.balance > 0 ? 'error.main' : fin.balance < 0 ? 'warning.main' : 'success.main';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxHeight: { sm: '88vh' } } }}
    >
      {/* Sticky başlık */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          px: { xs: 2, sm: 3 },
          py: 2,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <Box
            sx={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'primary.light',
              color: 'primary.dark',
            }}
          >
            <DirectionsCar fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography sx={{ fontWeight: 750, fontSize: '1.05rem' }}>Kiralama Detayı</Typography>
              <Chip size="small" label={getStatusText(rental.status)} color={getStatusColor(rental.status)} />
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {rental.vehicle?.name || 'Araç'} · {rental.vehicle?.plate} · {rental.customer?.fullName || 'Müşteri'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Kapat">
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2.5, bgcolor: a.surface }}>
        <Grid container spacing={2}>
          {/* Genel bilgiler */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 2, height: '100%', bgcolor: a.raised, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <SectionTitle>GENEL BİLGİLER</SectionTitle>
              <InfoRow label="Başlangıç" value={formatDate(rental.startDate)} />
              <InfoRow label="Bitiş" value={formatDate(rental.endDate)} />
              <InfoRow label="Gün sayısı" value={`${rental.days} gün`} />
              <InfoRow label="Oluşturulma" value={formatDateTime(rental.createdAt)} />
            </Box>
          </Grid>

          {/* Müşteri + araç */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 2, height: '100%', bgcolor: a.raised, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <SectionTitle>MÜŞTERİ VE ARAÇ</SectionTitle>
              <InfoRow label="Müşteri" value={rental.customer?.fullName || '-'} />
              <InfoRow label="Telefon" value={rental.customer?.phone || '-'} />
              <InfoRow label="Araç" value={rental.vehicle?.name || '-'} />
              <InfoRow label="Plaka" value={rental.vehicle?.plate || '-'} />
              {rental.vehicle?.year && <InfoRow label="Model yılı" value={rental.vehicle.year} />}
            </Box>
          </Grid>

          {/* Ücret detayları */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 2, height: '100%', bgcolor: a.raised, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <SectionTitle>ÜCRET DETAYLARI</SectionTitle>
              <InfoRow label="Günlük ücret" value={formatCurrency(rental.dailyPrice)} />
              <InfoRow label={`Kira bedeli (${rental.days} gün)`} value={formatCurrency(fin.rentBase)} />
              {extraRows.map((row) => (
                <InfoRow key={row.label} label={row.label} value={formatCurrency(row.amount)} />
              ))}
              <Divider sx={{ my: 0.75 }} />
              <InfoRow label="Genel toplam" value={<strong>{formatCurrency(fin.totalAmount)}</strong>} />
            </Box>
          </Grid>

          {/* Taksitler */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 2, height: '100%', bgcolor: a.raised, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <SectionTitle>PEŞİN VE TAKSİTLER</SectionTitle>
              {installmentRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Taksitli ödeme kaydı bulunmuyor.</Typography>
              ) : (
                installmentRows.map((row) => (
                  <InfoRow
                    key={row.label}
                    label={row.date ? `${row.label} · ${formatDate(row.date)}` : row.label}
                    value={formatCurrency(row.amount)}
                  />
                ))
              )}
              {fin.extraPayments > 0 && (
                <>
                  <Divider sx={{ my: 0.75 }} />
                  <InfoRow label="Ek ödemeler toplamı" value={formatCurrency(fin.extraPayments)} />
                </>
              )}
            </Box>
          </Grid>

          {/* Ödeme kayıtları */}
          {(rental.payments || []).length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ bgcolor: a.raised, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}>
                <Box sx={{ px: 2, pt: 2 }}>
                  <SectionTitle>ÖDEME KAYITLARI</SectionTitle>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell>Yöntem</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(rental.payments || []).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paidAt)}</TableCell>
                        <TableCell>{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(payment.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Grid>
          )}

          {/* Not */}
          {displayNote && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: a.raised, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                <SectionTitle>NOT</SectionTitle>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{displayNote}</Typography>
              </Box>
            </Grid>
          )}

          {/* Finansal özet */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: a.raised,
                border: '1px solid',
                borderColor: fin.balance > 0 ? 'error.light' : 'divider',
              }}
            >
              <Grid container spacing={1.5}>
                {[
                  { label: 'Genel Toplam', value: formatCurrency(fin.totalAmount), color: 'text.primary' },
                  { label: 'Tahsil Edilen', value: formatCurrency(fin.totalPaid), color: 'info.dark' },
                  {
                    label: fin.balance < 0 ? 'Fazla Ödeme' : 'Kalan Bakiye',
                    value: formatCurrency(Math.abs(fin.balance)),
                    color: balanceColor,
                  },
                ].map((item) => (
                  <Grid item xs={4} key={item.label}>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.2rem' }, color: item.color }}>
                      {item.value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.75, borderTop: '1px solid', borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
        <Button
          component={RouterLink}
          to={`/rentals/${rental.id}`}
          startIcon={<OpenInNew />}
          size="small"
          sx={{ mr: 'auto', color: 'text.secondary' }}
        >
          Tam Sayfa
        </Button>
        <Button onClick={onClose}>Kapat</Button>
        <Button startIcon={<Edit />} variant="outlined" onClick={() => onEdit(rental)}>Düzenle</Button>
        <Button startIcon={<PaymentIcon />} variant="outlined" color="success" onClick={() => onAddPayment(rental)}>
          Ödeme Ekle
        </Button>
        {rental.status === 'ACTIVE' && (
          <Button startIcon={<DirectionsCar />} variant="contained" onClick={() => onComplete(rental)}>
            Teslim Al
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
