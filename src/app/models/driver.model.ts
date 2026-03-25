export interface Driver {
  id?: string;
  uid?: string;
  name: string;
  nameAr?: string;
  phone: string;
  photoUrl?: string;
  routeId: string;
  plateNumber?: string;
  vehicleType: 'bus' | 'minibus' | 'van' | 'car';
  isActive: boolean;
  rating: number;
  ratingCount: number;
  createdAt?: any;
}
