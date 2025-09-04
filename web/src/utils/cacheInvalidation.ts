import { QueryClient } from '@tanstack/react-query';

/**
 * Tüm kiralama ile ilgili cache'leri yeniler
 * Tüm sayfalar senkronize çalışsın diye standart invalidation fonksiyonu
 */
export const invalidateAllRentalCaches = (queryClient: QueryClient) => {
  // Rental listesi cache'leri
  queryClient.invalidateQueries({ queryKey: ['rentals'] });
  queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
  queryClient.invalidateQueries({ queryKey: ['completed-rentals'] });
  queryClient.invalidateQueries({ queryKey: ['all-rentals'] });
  queryClient.invalidateQueries({ queryKey: ['consignment-rentals'] });
  
  // Dashboard cache'leri
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  queryClient.invalidateQueries({ queryKey: ['debtors'] });
  
  // Araç cache'leri
  queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  queryClient.invalidateQueries({ queryKey: ['idle-vehicles'] });
  queryClient.invalidateQueries({ queryKey: ['reserved-vehicles'] });
  queryClient.invalidateQueries({ queryKey: ['service-vehicles'] });
  queryClient.invalidateQueries({ queryKey: ['vehicles-all'] });
  
  // Rapor cache'leri
  queryClient.invalidateQueries({ queryKey: ['vehicle-income-report'] });
  queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
  queryClient.invalidateQueries({ queryKey: ['revenue-analysis'] });
  
  // Müşteri cache'leri
  queryClient.invalidateQueries({ queryKey: ['customers'] });
  
  console.log('🔄 Tüm cache\'ler yenilendi - sayfalar senkronize');
};

/**
 * Belirli bir kiralama için cache'leri yeniler
 */
export const invalidateRentalCache = (queryClient: QueryClient, rentalId: string) => {
  queryClient.invalidateQueries({ queryKey: ['rental', rentalId] });
  queryClient.invalidateQueries({ queryKey: ['rental-payments', rentalId] });
  
  // Tüm cache'leri de yenile ki diğer sayfalar güncellenen veriyi görsün
  invalidateAllRentalCaches(queryClient);
  
  console.log(`🔄 Kiralama ${rentalId} cache'i yenilendi`);
};

/**
 * Cache temizleme ve yenileme (agresif mod)
 */
export const clearAndRefreshCaches = (queryClient: QueryClient) => {
  // Tüm cache'i temizle
  queryClient.clear();
  
  // Kritik verileri tekrar yükle
  setTimeout(() => {
    queryClient.refetchQueries({ queryKey: ['rentals'] });
    queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });
    queryClient.refetchQueries({ queryKey: ['vehicles'] });
    queryClient.refetchQueries({ queryKey: ['customers'] });
  }, 100);
  
  console.log('🔄 Tüm cache temizlendi ve kritik veriler yenileniyor');
};
