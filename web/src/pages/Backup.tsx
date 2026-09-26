import { ReactNode, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import {
  DataObjectOutlined,
  DeleteOutline,
  DownloadOutlined,
  PictureAsPdfOutlined,
  ScheduleOutlined,
  TableChartOutlined,
  HistoryOutlined,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { backupApi, formatDate, vehiclesApi, rentalsApi } from '../api/client';
import { formatCurrency } from '../utils/currency';
import { getVehicleStatusText, getStatusText } from '../utils/status';
import { a, monoSx } from '../admin/theme';
import { ConfirmDialog, DataTable, EmptyState, KpiTile, PageHeader, Panel, RowActions, StatusBadge, Sub, panelSx, kpiRow3Sx } from '../admin/ui';

const formatFileSize = (bytes: number): string => {
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  if (kb >= 1) return `${kb.toFixed(1)} KB`;
  return `${bytes} B`;
};

function ExportTile({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: ReactNode }) {
  return (
    <Box sx={{ ...panelSx, p: 2.5, display: 'grid', gap: 1.25, alignContent: 'start' }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: a.accentSoft, color: a.accent, '& svg': { fontSize: 21 } }}>{icon}</Box>
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: 16 }}>{title}</Typography>
      <Typography sx={{ color: a.muted, fontSize: 13.5, minHeight: { md: 60 } }}>{text}</Typography>
      <Box sx={{ mt: 0.5 }}>{action}</Box>
    </Box>
  );
}

export default function Backup() {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState('');

  const { data: backupHistory, isLoading, refetch } = useQuery({
    queryKey: ['backup-history'],
    queryFn: () => backupApi.getBackupHistory(),
    staleTime: 30000,
  });

  const createBackupMutation = useMutation({
    mutationFn: () => backupApi.exportBackup(),
    onSuccess: (data) => {
      refetch();
      // Yedeği otomatik indir
      if (data.data.downloadData) {
        const blob = new Blob([JSON.stringify(data.data.downloadData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.data.backup.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (filename: string) => backupApi.downloadBackup(filename),
    onSuccess: (data, filename) => {
      const url = window.URL.createObjectURL(new Blob([data.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => backupApi.deleteBackup(filename),
    onSuccess: () => {
      refetch();
      setConfirmDelete(null);
    },
  });

  const fetchAll = async () => {
    const [vehiclesRes, rentalsRes] = await Promise.all([vehiclesApi.getAll(undefined, 1000), rentalsApi.getAll({ limit: 1000 })]);
    return { vehicles: vehiclesRes.data || [], rentals: rentalsRes.data.data || [] };
  };

  // Kiralama tutarları TL; araç performans alanları kuruş.
  const exportToExcel = async () => {
    setExporting('excel');
    setExportError('');
    try {
      // xlsx yalnızca dışa aktarırken yüklenir
      const XLSX = await import('xlsx');
      const { vehicles, rentals } = await fetchAll();
      const wb = XLSX.utils.book_new();

      const vehiclesData = vehicles.map((vehicle) => ({
        'Plaka': vehicle.plate,
        'Araç Adı': vehicle.name,
        'Durum': getVehicleStatusText(vehicle.status),
        'Günlük Fiyat': vehicle.dailyRate != null ? vehicle.dailyRate / 100 : '',
        'Toplam Gelir': vehicle.performance?.totalRevenue ? vehicle.performance.totalRevenue / 100 : 0,
        'Tahsil Edilen': vehicle.performance?.totalCollected ? vehicle.performance.totalCollected / 100 : 0,
        'Kalan Borç': vehicle.performance?.totalBalance ? vehicle.performance.totalBalance / 100 : 0,
        'Kiralama Sayısı': vehicle._count?.rentals || 0,
      }));

      const rentalsData = rentals.map((rental) => {
        const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
        const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
        const totalPaid = paidFromRental + paidFromPayments;
        return {
          'Kiralama ID': rental.id,
          'Müşteri': rental.customer?.fullName || '',
          'Telefon': rental.customer?.phone || '',
          'Araç Plaka': rental.vehicle?.plate || '',
          'Araç Adı': rental.vehicle?.name || '',
          'Başlangıç Tarihi': dayjs(rental.startDate).format('DD.MM.YYYY'),
          'Bitiş Tarihi': dayjs(rental.endDate).format('DD.MM.YYYY'),
          'Gün Sayısı': rental.days,
          'Günlük Fiyat': rental.dailyPrice,
          'Toplam Tutar': rental.totalDue,
          'Ödenen Tutar': totalPaid,
          'Kalan Borç': rental.totalDue - totalPaid,
          'Durum': getStatusText(rental.status),
          'Not': rental.note?.replace(/ORIGINAL_TOTAL:\d+\|?/, '').trim() || '',
        };
      });

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vehiclesData), 'Araçlar');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rentalsData), 'Kiralamalar');
      XLSX.writeFile(wb, `ss-filo-yedek-${dayjs().format('DD-MM-YYYY')}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      setExportError('Excel dosyası oluşturulurken hata oluştu.');
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = async () => {
    setExporting('pdf');
    setExportError('');
    try {
      // jsPDF (~430 KB, html2canvas dahil) yalnızca PDF oluştururken yüklenir
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const { vehicles, rentals } = await fetchAll();
      const doc = new jsPDF();
      const brandColor: [number, number, number] = [110, 31, 47];

      doc.setFontSize(18);
      doc.text('SS Filo - Özet Raporu', 14, 20);
      doc.setFontSize(12);
      doc.text(`Tarih: ${dayjs().format('DD.MM.YYYY HH:mm')}`, 14, 30);

      doc.setFontSize(14);
      doc.text('Genel İstatistikler', 14, 45);
      doc.setFontSize(10);
      doc.text(`Toplam Araç Sayısı: ${vehicles.length}`, 14, 55);
      doc.text(`Toplam Kiralama Sayısı: ${rentals.length}`, 14, 65);

      const activeRentals = rentals.filter((r) => r.status === 'ACTIVE').length;
      const completedRentals = rentals.filter((r) => r.status === 'COMPLETED').length;
      doc.text(`Aktif Kiralamalar: ${activeRentals}`, 14, 75);
      doc.text(`Tamamlanan Kiralamalar: ${completedRentals}`, 14, 85);

      doc.setFontSize(12);
      doc.text('Araç Özeti', 14, 100);

      autoTable(doc, {
        head: [['Plaka', 'Araç Adı', 'Durum', 'Günlük', 'Kiralama']],
        body: vehicles.slice(0, 10).map((vehicle) => [
          vehicle.plate || '',
          vehicle.name || '',
          getVehicleStatusText(vehicle.status),
          vehicle.dailyRate != null ? formatCurrency(vehicle.dailyRate / 100) : '-',
          (vehicle._count?.rentals || 0).toString(),
        ]),
        startY: 110,
        styles: { fontSize: 8 },
        headStyles: { fillColor: brandColor },
        margin: { left: 14, right: 14 },
      });

      if (activeRentals > 0) {
        const finalY = (doc as any).lastAutoTable?.finalY || 150;
        doc.setFontSize(12);
        doc.text('Aktif Kiralamalar', 14, finalY + 15);
        autoTable(doc, {
          head: [['Plaka', 'Müşteri', 'Başlangıç', 'Gün', 'Tutar', 'Kalan']],
          body: rentals
            .filter((r) => r.status === 'ACTIVE')
            .slice(0, 8)
            .map((rental) => {
              const paidFromRental = rental.upfront + rental.pay1 + rental.pay2 + rental.pay3 + rental.pay4;
              const paidFromPayments = (rental.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
              return [
                rental.vehicle?.plate || '',
                rental.customer?.fullName || '',
                dayjs(rental.startDate).format('DD.MM.YY'),
                rental.days.toString(),
                formatCurrency(rental.totalDue),
                formatCurrency(rental.totalDue - (paidFromRental + paidFromPayments)),
              ];
            }),
          startY: finalY + 25,
          styles: { fontSize: 7 },
          headStyles: { fillColor: brandColor },
          margin: { left: 14, right: 14 },
        });
      }

      doc.save(`ss-filo-ozet-${dayjs().format('DD-MM-YYYY')}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      setExportError('PDF dosyası oluşturulurken hata oluştu.');
    } finally {
      setExporting(null);
    }
  };

  const backups = backupHistory?.data.backups || [];
  const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);

  return (
    <>
      <PageHeader title="Yedekleme" subtitle="Verilerinizi dışa aktarın ve teknik yedekleri yönetin." />

      {exportError && <Alert severity="error" onClose={() => setExportError('')} sx={{ mb: 2 }}>{exportError}</Alert>}
      {createBackupMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Yedek oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.</Alert>}
      {createBackupMutation.isSuccess && <Alert severity="success" onClose={() => createBackupMutation.reset()} sx={{ mb: 2 }}>Yedek oluşturuldu ve indirildi.</Alert>}

      <Box sx={{ display: 'grid', gap: 2, mb: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' } }}>
        <ExportTile
          icon={<TableChartOutlined />}
          title="Excel"
          text="Tüm araç ve kiralama kayıtları iki sayfalık bir tabloda. Muhasebe ve hesap tabloları için."
          action={
            <Button variant="contained" startIcon={exporting === 'excel' ? <CircularProgress size={16} color="inherit" /> : <DownloadOutlined />} onClick={exportToExcel} disabled={exporting !== null}>
              {exporting === 'excel' ? 'Hazırlanıyor…' : 'Excel indir'}
            </Button>
          }
        />
        <ExportTile
          icon={<PictureAsPdfOutlined />}
          title="PDF özet"
          text="Filo özeti ve aktif kiralamalar tek sayfalık rapor halinde. Paylaşmak ve yazdırmak için."
          action={
            <Button variant="outlined" startIcon={exporting === 'pdf' ? <CircularProgress size={16} /> : <DownloadOutlined />} onClick={exportToPDF} disabled={exporting !== null}>
              {exporting === 'pdf' ? 'Hazırlanıyor…' : 'PDF indir'}
            </Button>
          }
        />
        <ExportTile
          icon={<DataObjectOutlined />}
          title="Teknik yedek"
          text="Sistemi geri yüklemek için tam veri dökümü (JSON). Sunucuda saklanır ve indirilir."
          action={
            <Button variant="outlined" startIcon={createBackupMutation.isPending ? <CircularProgress size={16} /> : <DataObjectOutlined />} onClick={() => createBackupMutation.mutate()} disabled={createBackupMutation.isPending}>
              {createBackupMutation.isPending ? 'Oluşturuluyor…' : 'Yedek oluştur'}
            </Button>
          }
        />
      </Box>

      <Box sx={kpiRow3Sx}>
        <KpiTile label="Yedek sayısı" loading={isLoading} value={backups.length} meta="Sunucuda saklanan" />
        <KpiTile label="Toplam boyut" loading={isLoading} value={formatFileSize(totalSize)} meta="Tüm yedekler" />
        <KpiTile label="Son yedek" loading={isLoading} value={backups[0] ? dayjs(backups[0].created).format('DD.MM.YY') : '—'} meta={backups[0] ? dayjs(backups[0].created).format('HH:mm') : 'Henüz yok'} />
      </Box>

      <Panel
        padded={false}
        title="Yedek geçmişi"
        subtitle="Sunucu, ayarlara göre otomatik yedek de alır (varsayılan: her pazar 02:00)."
        action={<Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: a.muted }}><ScheduleOutlined sx={{ fontSize: 18 }} /><Typography sx={{ fontSize: 12.5, display: { xs: 'none', sm: 'block' } }}>Otomatik</Typography></Stack>}
      >
        <DataTable
          rows={backups}
          rowKey={(backup) => backup.filename}
          loading={isLoading}
          empty={<EmptyState icon={<HistoryOutlined />} title="Henüz yedek yok" subtitle="Yukarıdan ilk teknik yedeği oluşturun." />}
          columns={[
            {
              key: 'file',
              header: 'Dosya',
              render: (backup) => (
                <>
                  <Box component="span" sx={{ ...monoSx, fontSize: 12.5, wordBreak: 'break-all' }}>{backup.filename}</Box>
                  {backup.recordCounts && Object.keys(backup.recordCounts).length > 0 && (
                    <Sub>{Object.entries(backup.recordCounts).map(([key, count]) => `${key}: ${count}`).join(' · ')}</Sub>
                  )}
                </>
              ),
            },
            { key: 'date', header: 'Tarih', hideBelow: 'sm', render: (backup) => <Box component="span" sx={{ ...monoSx, fontSize: 13 }}>{formatDate(backup.created)}</Box> },
            { key: 'size', header: 'Boyut', align: 'right', hideBelow: 'sm', render: (backup) => <Box component="span" sx={{ ...monoSx, fontSize: 13 }}>{formatFileSize(backup.size)}</Box> },
            { key: 'state', header: 'Durum', render: (backup) => (backup.error ? <StatusBadge label="Hatalı" tone="danger" /> : <StatusBadge label="Hazır" tone="success" />) },
            {
              key: 'actions',
              header: '',
              align: 'right',
              width: 150,
              render: (backup) => (
                <RowActions
                  primary={{ label: 'İndir', icon: <DownloadOutlined />, disabled: downloadMutation.isPending || !!backup.error, onClick: () => downloadMutation.mutate(backup.filename) }}
                  items={[{ label: 'Sil', icon: <DeleteOutline />, danger: true, onClick: () => setConfirmDelete(backup.filename) }]}
                />
              ),
            },
          ]}
        />
      </Panel>

      <ConfirmDialog
        open={!!confirmDelete}
        danger
        title="Yedeği sil"
        body={<>Bu yedek dosyası kalıcı olarak silinecek. <Box component="span" sx={{ ...monoSx, display: 'block', mt: 1, fontSize: 12.5, color: a.ink, wordBreak: 'break-all' }}>{confirmDelete}</Box></>}
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        pending={deleteMutation.isPending}
        error={deleteMutation.isError ? 'Yedek silinemedi.' : undefined}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  );
}
