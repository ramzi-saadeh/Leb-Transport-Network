export interface WaitingPassenger {
  id?: string;
  routeId: string;
  location: { lat: number; lng: number };
  count: number;
  deviceId: string;
  createdAt?: any;
  expiresAt?: any;
}
