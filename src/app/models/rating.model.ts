export interface Rating {
  id?: string;
  driverId: string;
  deviceId: string;
  rating: number; // 1-5
  comment?: string;
  routeId?: string;
  createdAt?: any;
}
