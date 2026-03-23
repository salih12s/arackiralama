export type RentalStatus = 'ACTIVE' | 'RETURNED' | 'COMPLETED' | 'CANCELLED';
export type VehicleStatus = 'IDLE' | 'RENTED' | 'RESERVED' | 'SERVICE';
export type StatusType = RentalStatus | VehicleStatus;

export const getStatusColor = (status: StatusType): 'primary' | 'success' | 'error' | 'warning' | 'default' | 'info' => {
  switch (status) {
    case 'ACTIVE': return 'primary';
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
    case 'ACTIVE': return 'KIRADA';
    case 'RENTED': return 'Kirada';
    case 'COMPLETED': return 'TESLİM EDİLDİ';
    case 'RETURNED': return 'TESLİM EDİLDİ';
    case 'IDLE': return 'Boşta';
    case 'CANCELLED': return 'İPTAL';
    case 'SERVICE': return 'Serviste';
    case 'RESERVED': return 'REZERVE';
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
