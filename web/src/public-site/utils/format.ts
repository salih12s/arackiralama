import dayjs from 'dayjs';
import 'dayjs/locale/tr';

dayjs.locale('tr');

export function formatTL(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date): string {
  return dayjs(value).format('DD MMMM YYYY');
}

export function formatDateShort(value: string | Date): string {
  return dayjs(value).format('DD.MM.YYYY');
}

/** Veritabanındaki büyük harfli değerleri ("DİZEL", "EKONOMİK") okunur hale getirir. */
export function formatSpec(value?: string | null): string {
  if (!value) return '';
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/(^|[\s/-])\S/g, (letter) => letter.toLocaleUpperCase('tr-TR'))
    // Kısaltmalar büyük harf kalır ("Suv" → "SUV").
    .replace(/(Suv|Lpg)/g, (word) => word.toLocaleUpperCase('tr-TR'));
}

/** Sayfa başlığı ve description'ı günceller (SPA SEO). */
export function setPageMeta(title: string, description?: string) {
  document.title = title;
  if (description) {
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', description);
  }
}


