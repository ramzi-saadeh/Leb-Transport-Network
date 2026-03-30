export interface LiveDriverLocation {
  lat: number;
  lng: number;
  routeId: string;
  heading: number;   // degrees 0-360
  isFull?: boolean;  // driver set bus as full
//   speed: number;     // km/h
  isActive: boolean;
  updatedAt: number; // unix ms
}

export interface LiveDriverLocationWithId extends LiveDriverLocation {
  id: string; // driverId
}
