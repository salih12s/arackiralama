import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CloudDownload as CloudDownloadIcon,
  History as HistoryIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  GetApp as ExcelIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { backupApi, formatDate, vehiclesApi, rentalsApi } from '../api/client';
import { formatCurrency } from '../utils/currency';
import Layout from '../components/Layout';

export default function Backup() {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Get backup history
  const { data: backupHistory, isLoading, refetch } = useQuery({
    queryKey: ['backup-history'],
    queryFn: () => backupApi.getBackupHistory(),
    staleTime: 30000,
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: () => backupApi.exportBackup(),
    onSuccess: (data) => {
      refetch();
      
      // Auto-download the backup
      if (data.data.downloadData) {
        const blob = new Blob([JSON.stringify(data.data.downloadData, null, 2)], {
          type: 'application/json'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.data.backup.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    },
  });

  // Download backup mutation
  const downloadMutation = useMutation({
    mutationFn: (filename: string) => backupApi.downloadBackup(filename),
    onSuccess: (data, filename) => {
      const url = window.URL.createObjectURL(new Blob([data.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });

  // Delete backup mutation
  const deleteMutation = useMutation({
    mutationFn: (filename: string) => backupApi.deleteBackup(filename),
    onSuccess: () => {
      refetch();
      setConfirmDelete(null);
    },
  });

  const handleCreateBackup = () => {
    createBackupMutation.mutate();
  };

  const handleDownload = (filename: string) => {
    downloadMutation.mutate(filename);
  };

  const handleDelete = (filename: string) => {
    setConfirmDelete(filename);
  };

  // Excel Export Function
  const exportToExcel = async () => {
    try {
      // Fetch all data
      const [vehiclesRes, rentalsRes] = await Promise.all([
        vehiclesApi.getAll(),
        rentalsApi.getAll({ limit: 1000 })
      ]);

      const vehicles = vehiclesRes.data || [];
      const rentals = rentalsRes.data.data || [];

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Vehicles sheet
      const vehiclesData = vehicles.map(vehicle => ({
        'Plaka': vehicle.plate,
        'Araç Adı': vehicle.name,
        'Durum': vehicle.status === 'IDLE' ? 'Boşta' : 
                vehicle.status === 'RENTED' ? 'Kirada' :
                vehicle.status === 'RESERVED' ? 'Rezerve' : 
                vehicle.status === 'SERVICE' ? 'Serviste' : vehicle.status,
        'Toplam Gelir': vehicle.performance?.totalRevenue ? vehicle.performance.totalRevenue / 100 : 0,
        'Tahsil Edilen': vehicle.performance?.totalCollected ? vehicle.performance.totalCollected / 100 : 0,
        'Kalan Borç': vehicle.performance?.totalBalance ? vehicle.performance.totalBalance / 100 : 0,
        'Kiralama Sayısı': vehicle._count?.rentals || 0,
      }));

      // Rentals sheet
      const rentalsData = rentals.map(rental => {
        const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
        const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
        const totalPaid = paidFromRental + paidFromPayments;
        const actualBalance = rental.totalDue - totalPaid;

        return {
          'Kiralama ID': rental.id,
          'Müşteri': rental.customer?.fullName || '',
          'Telefon': rental.customer?.phone || '',
          'Araç Plaka': rental.vehicle?.plate || '',
          'Araç Adı': rental.vehicle?.name || '',
          'Başlangıç Tarihi': dayjs(rental.startDate).format('DD.MM.YYYY'),
          'Bitiş Tarihi': dayjs(rental.endDate).format('DD.MM.YYYY'),
          'Gün Sayısı': rental.days,
          'Günlük Fiyat': rental.dailyPrice / 100,
          'Toplam Tutar': rental.totalDue / 100,
          'Ödenen Tutar': totalPaid / 100,
          'Kalan Borç': actualBalance / 100,
          'Durum': rental.status === 'ACTIVE' ? 'Aktif' :
                  rental.status === 'COMPLETED' ? 'Tamamlandı' :
                  rental.status === 'CANCELLED' ? 'İptal Edildi' : rental.status,
          'Not': rental.note || '',
        };
      });

      // Add sheets
      const vehiclesWs = XLSX.utils.json_to_sheet(vehiclesData);
      const rentalsWs = XLSX.utils.json_to_sheet(rentalsData);
      
      XLSX.utils.book_append_sheet(wb, vehiclesWs, 'Araçlar');
      XLSX.utils.book_append_sheet(wb, rentalsWs, 'Kiralamalar');

      // Save file
      XLSX.writeFile(wb, `arac-kiralama-yedek-${dayjs().format('DD-MM-YYYY')}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel dosyası oluşturulurken hata oluştu');
    }
  };

  // PDF Export Function
  const exportToPDF = async () => {
    try {
      // Fetch summary data
      const [vehiclesRes, rentalsRes] = await Promise.all([
        vehiclesApi.getAll(),
        rentalsApi.getAll({ limit: 100 })
      ]);

      const vehicles = vehiclesRes.data || [];
      const rentals = rentalsRes.data.data || [];

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('Araç Kiralama Sistemi - Özet Raporu', 14, 20);
      doc.setFontSize(12);
      doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY HH:mm')}`, 14, 30);
      
      // Summary Stats
      doc.setFontSize(14);
      doc.text('Genel İstatistikler', 14, 45);
      doc.setFontSize(10);
      doc.text(`Toplam Araç Sayısı: ${vehicles.length}`, 14, 55);
      doc.text(`Toplam Kiralama Sayısı: ${rentals.length}`, 14, 65);
      
      const activeRentals = rentals.filter(r => r.status === 'ACTIVE').length;
      const completedRentals = rentals.filter(r => r.status === 'COMPLETED').length;
      doc.text(`Aktif Kiralamalar: ${activeRentals}`, 14, 75);
      doc.text(`Tamamlanan Kiralamalar: ${completedRentals}`, 14, 85);

      // Vehicle summary table
      doc.setFontSize(12);
      doc.text('Araç Özeti', 14, 100);
      
      const vehicleTableData = vehicles.slice(0, 10).map(vehicle => [
        vehicle.plate || '',
        vehicle.name || '',
        vehicle.status === 'IDLE' ? 'Boşta' : 
        vehicle.status === 'RENTED' ? 'Kirada' :
        vehicle.status === 'RESERVED' ? 'Rezerve' : 
        vehicle.status === 'SERVICE' ? 'Serviste' : vehicle.status,
        '₺0', // Günlük fiyat bilgisi araç modelinde yok
        (vehicle._count?.rentals || 0).toString()
      ]);

      autoTable(doc, {
        head: [['Plaka', 'Araç Adı', 'Durum', 'Fiyat', 'Kiralama']],
        body: vehicleTableData,
        startY: 110,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [13, 50, 130] },
        margin: { left: 14, right: 14 },
      });

      // Active rentals table (if space permits)
      if (activeRentals > 0) {
        const finalY = (doc as any).lastAutoTable?.finalY || 150;
        
        doc.setFontSize(12);
        doc.text('Aktif Kiralamalar', 14, finalY + 15);
        
        const activeRentalData = rentals
          .filter(r => r.status === 'ACTIVE')
          .slice(0, 8)
          .map(rental => {
            const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
            const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
            const actualBalance = rental.totalDue - (paidFromRental + paidFromPayments);
            
            return [
              rental.vehicle?.plate || '',
              rental.customer?.fullName || '',
              dayjs(rental.startDate).format('DD.MM.YY'),
              rental.days.toString(),
              formatCurrency(rental.totalDue),
              formatCurrency(actualBalance)
            ];
          });

        autoTable(doc, {
          head: [['Plaka', 'Müşteri', 'Başlangıç', 'Gün', 'Tutar', 'Kalan']],
          body: activeRentalData,
          startY: finalY + 25,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [13, 50, 130] },
          margin: { left: 14, right: 14 },
        });
      }

      doc.save(`arac-kiralama-ozet-${dayjs().format('DD-MM-YYYY')}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF dosyası oluşturulurken hata oluştu');
    }
  };

  const confirmDeleteBackup = () => {
    if (confirmDelete) {
      deleteMutation.mutate(confirmDelete);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(1)} KB`;
    } else {
      return `${bytes} B`;
    }
  };

  const backups = backupHistory?.data.backups || [];

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Veri Yedekleme
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sistem verilerinizi yedekleyip geri yükleyebilirsiniz
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Create Backup Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BackupIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6">
                      Yeni Yedek Oluştur
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tüm sistem verilerini yedekleyin
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  <strong>Excel:</strong> Tüm araç ve kiralama verilerinizi Excel dosyası olarak indirin. 
                  Hesap tablolarında kullanabilirsiniz.
                  <br />
                  <strong>PDF:</strong> Sistem özetini ve aktif kiralamaları PDF raporu olarak alın.
                  <br />
                  <strong>JSON:</strong> Teknik yedek dosyası (sistem geri yükleme için).
                </Typography>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Önerilen:</strong> Müşteri kullanımı için Excel ve PDF formatlarını tercih edin. 
                  JSON sadece teknik geri yükleme için gereklidir.
                </Alert>
              </CardContent>

              <CardActions>
                <Stack spacing={1} sx={{ width: '100%' }}>
                  {/* JSON Backup - Technical */}
                  <Button
                    variant="outlined"
                    startIcon={createBackupMutation.isPending ? <CircularProgress size={20} /> : <CloudDownloadIcon />}
                    onClick={handleCreateBackup}
                    disabled={createBackupMutation.isPending}
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    {createBackupMutation.isPending ? 'JSON Yedek Oluşturuluyor...' : 'Teknik Yedek (JSON)'}
                  </Button>
                  
                  {/* User-friendly exports */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<ExcelIcon />}
                      onClick={exportToExcel}
                      sx={{ flexGrow: 1, bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                    >
                      Excel İndir
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<PdfIcon />}
                      onClick={exportToPDF}
                      sx={{ flexGrow: 1, bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
                    >
                      PDF İndir
                    </Button>
                  </Stack>
                </Stack>
              </CardActions>

              {createBackupMutation.isError && (
                <CardContent sx={{ pt: 0 }}>
                  <Alert severity="error">
                    Yedek oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.
                  </Alert>
                </CardContent>
              )}

              {createBackupMutation.isSuccess && (
                <CardContent sx={{ pt: 0 }}>
                  <Alert severity="success">
                    Yedek başarıyla oluşturuldu ve indirildi!
                  </Alert>
                </CardContent>
              )}
            </Card>
          </Grid>

          {/* Backup Stats */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StorageIcon sx={{ mr: 2, color: 'info.main', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6">
                      Yedek İstatistikleri
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mevcut yedek durumu
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Toplam Yedek Sayısı:</Typography>
                    <Chip label={backups.length} color="primary" size="small" />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Toplam Boyut:</Typography>
                    <Chip 
                      label={formatFileSize(backups.reduce((sum, backup) => sum + backup.size, 0))} 
                      color="info" 
                      size="small" 
                    />
                  </Box>

                  {backups.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Son Yedek:</Typography>
                      <Typography variant="body2" color="primary.main">
                        {formatDate(backups[0].created)}
                      </Typography>
                    </Box>
                  )}

                  <Divider />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="success" />
                    <Typography variant="body2" color="success.main">
                      Otomatik yedekleme özelliği yakında eklenecek
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Backup History */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <HistoryIcon sx={{ mr: 2, color: 'secondary.main', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6">
                      Yedek Geçmişi
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Önceki yedeklerinizi yönetin
                    </Typography>
                  </Box>
                </Box>

                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : backups.length === 0 ? (
                  <Alert severity="info">
                    Henüz hiç yedek oluşturulmamış. Yukarıdaki butona tıklayarak ilk yedeğinizi oluşturun.
                  </Alert>
                ) : (
                  <List>
                    {backups.map((backup, index) => (
                      <ListItem
                        key={backup.filename}
                        divider={index < backups.length - 1}
                        sx={{ 
                          flexDirection: { xs: 'column', md: 'row' },
                          alignItems: { xs: 'flex-start', md: 'center' },
                          gap: { xs: 1, md: 0 }
                        }}
                      >
                        <ListItemText
                          primary={backup.filename}
                          secondary={
                            <span style={{ display: 'block' }}>
                              📅 {formatDate(backup.created)} • 📦 {formatFileSize(backup.size)}
                              {backup.recordCounts && Object.keys(backup.recordCounts).length > 0 && (
                                <>
                                  <br />
                                  📊 {Object.entries(backup.recordCounts).map(([key, count]) => 
                                    `${key}: ${count}`
                                  ).join(', ')}
                                </>
                              )}
                            </span>
                          }
                          primaryTypographyProps={{
                            sx: { 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              flexWrap: 'wrap'
                            }
                          }}
                        />
                        
                        {backup.error && (
                          <Chip 
                            label="Hatalı" 
                            color="error" 
                            size="small" 
                            sx={{ ml: 1 }}
                          />
                        )}
                        
                        <ListItemSecondaryAction sx={{ position: { xs: 'static', md: 'absolute' } }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              color="primary"
                              onClick={() => handleDownload(backup.filename)}
                              disabled={downloadMutation.isPending || !!backup.error}
                              size="small"
                            >
                              {downloadMutation.isPending ? 
                                <CircularProgress size={20} /> : 
                                <DownloadIcon />
                              }
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleDelete(backup.filename)}
                              disabled={deleteMutation.isPending}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Yedeği Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu yedek dosyasını silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>Dosya:</strong> {confirmDelete}
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Bu işlem geri alınamaz!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>
            İptal
          </Button>
          <Button 
            onClick={confirmDeleteBackup}
            color="error" 
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
