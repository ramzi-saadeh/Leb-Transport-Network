export interface Route {
  id?: string;
  name: string;
  nameAr: string;
  from: string;
  to: string;
  fromAr: string;
  toAr: string;
  priceMin: number;
  priceMax: number;
  frequencyLabel: string;
  frequencyLabelAr: string;
  waypoints?: { lat: number; lng: number }[];
  active: boolean;
  color?: string; // for map polyline
}
