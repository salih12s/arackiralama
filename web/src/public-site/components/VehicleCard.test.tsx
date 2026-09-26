import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VehicleCard from './VehicleCard';
import { PublicVehicle } from '../api/client';

const vehicle: PublicVehicle = {
  id: 'vehicle-1',
  name: 'Test Otomobil',
  plate: '06 ••• 06',
  category: 'KONFOR',
  year: 2025,
  fuelType: 'BENZİN',
  transmission: 'OTOMATİK',
  seats: 5,
  dailyRate: 4900,
  description: 'Gerçek API açıklamasını temsil eden test içeriği.',
  imageUrl: 'https://cdn.example.com/vehicle.webp',
  available: true,
  quote: { days: 3, dailyRateTL: 4900, totalTL: 14700 },
};

afterEach(cleanup);

describe('VehicleCard', () => {
  it('primary görsel, gerçek fiyat ve backend quote bilgisini gösterir', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><VehicleCard vehicle={vehicle} dateParams="start=2026-07-17&end=2026-07-20" /></MemoryRouter>);

    expect(screen.getByRole('img', { name: 'Test Otomobil' }).getAttribute('src')).toBe(vehicle.imageUrl);
    expect(screen.getByText(/4\.900/)).toBeTruthy();
    expect(screen.getByText(/3 gün için tahmini/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Rezervasyon Yap' }).hasAttribute('disabled')).toBe(false);
  });

  it('servisteki aracı rezervasyona kapatır', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><VehicleCard vehicle={{ ...vehicle, available: false, unavailableReason: 'SERVICE' }} /></MemoryRouter>);

    expect(screen.getByText('Serviste')).toBeTruthy();
    expect(screen.getByText('Şu anda rezervasyona kapalı')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Rezervasyon Yap' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('seçim modunda yalnız aktif buton üzerinden seçim yapar', () => {
    const onSelect = vi.fn();
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><VehicleCard vehicle={vehicle} selectable onSelect={onSelect} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Bu Aracı Seç' }));
    expect(onSelect).toHaveBeenCalledWith(vehicle);
  });
});
