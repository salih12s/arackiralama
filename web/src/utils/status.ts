export type RentalStatus = 'ACTIVE' | 'RETURNED' | 'COMPLETED' | 'CANCELLED';
export type VehicleStatus = 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE';
export type ReservationStatus = 'PENDING' | 'CONFIRMED';
export type StatusType = RentalStatus | VehicleStatus | ReservationStatus;

export const getStatusColor = (status: StatusType): 'primary' | 'success' | 'error' | 'warning' | 'default' | 'info' => {
  switch (status) {
    case 'ACTIVE': return 'primary';
    case 'PENDING': return 'warning';
    case 'CONFIRMED': return 'success';
    case 'RENTED': return 'primary';
    case 'COMPLETED': return 'success';
    case 'RETURNED': return 'success';
    case 'IDLE': return 'default';
    case 'CANCELLED': return 'error';
    case 'SERVICE': return 'error';
    case 'RESERVED': return 'warning';
    default: return 'default';
  }
};

export const getStatusText = (status: StatusType): string => {
  switch (status) {
    case 'ACTIVE': return 'Kirada';
    case 'PENDING': return 'Bekliyor';
    case 'CONFIRMED': return 'Onaylandı';
    case 'RENTED': return 'Kirada';
    case 'COMPLETED': return 'Teslim Edildi';
    case 'RETURNED': return 'Teslim Edildi';
    case 'IDLE': return 'Boşta';
    case 'CANCELLED': return 'İptal';
    case 'SERVICE': return 'Serviste';
    case 'RESERVED': return 'Rezerve';
    default: return status;
  }
};

export const getVehicleStatusText = (status: VehicleStatus): string => {
  switch (status) {
    case 'IDLE': return 'Boşta';
    case 'RENTED': return 'Kirada';
    case 'RESERVED': return 'Rezerve';
    case 'SERVICE': return 'Serviste';
    default: return status;
  }
};
