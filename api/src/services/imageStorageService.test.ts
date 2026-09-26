import { detectImageMime, isLegacyDataUrl } from './imageStorageService';

describe('image storage validation', () => {
  it('detects supported formats from binary signatures', () => {
    expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
    expect(detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectImageMime(Buffer.from('RIFFxxxxWEBP'))).toBe('image/webp');
    expect(detectImageMime(Buffer.from('<svg></svg>'))).toBeNull();
  });

  it('marks all legacy image data URLs as legacy content', () => {
    expect(isLegacyDataUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isLegacyDataUrl('data:image/gif;base64,AAAA')).toBe(true);
    expect(isLegacyDataUrl('https://cdn.example.com/car.webp')).toBe(false);
  });
});
