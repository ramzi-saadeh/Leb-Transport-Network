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
  fcmToken?: string;   // FCM device token — used to target push notifications
  verified?: boolean;  // Admin-controlled verification flag
  createdAt?: any;
}
