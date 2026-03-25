import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, query, where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Route } from '../models/route.model';

const SEED_ROUTES: Omit<Route, 'id'>[] = [
  {
    name: 'Tripoli → Beirut', nameAr: 'طرابلس ← بيروت',
    from: 'Tripoli', to: 'Beirut', fromAr: 'طرابلس', toAr: 'بيروت',
    priceMin: 50000, priceMax: 80000,
    frequencyLabel: 'Every 15–30 min', frequencyLabelAr: 'كل ١٥–٣٠ دقيقة',
    active: true, color: '#F5A623',
    waypoints: [
      { lat: 34.4367, lng: 35.8497 },
      { lat: 34.2427, lng: 35.6500 },
      { lat: 33.8938, lng: 35.5018 },
    ]
  },
  {
    name: 'Tripoli → Batroun', nameAr: 'طرابلس ← البترون',
    from: 'Tripoli', to: 'Batroun', fromAr: 'طرابلس', toAr: 'البترون',
    priceMin: 25000, priceMax: 40000,
    frequencyLabel: 'Every 30 min', frequencyLabelAr: 'كل ٣٠ دقيقة',
    active: true, color: '#3B82F6',
    waypoints: [
      { lat: 34.4367, lng: 35.8497 },
      { lat: 34.2627, lng: 35.6609 },
    ]
  },
  {
    name: 'Tripoli → Akkar', nameAr: 'طرابلس ← عكار',
    from: 'Tripoli', to: 'Akkar', fromAr: 'طرابلس', toAr: 'عكار',
    priceMin: 20000, priceMax: 35000,
    frequencyLabel: 'Every 45 min', frequencyLabelAr: 'كل ٤٥ دقيقة',
    active: true, color: '#22C55E',
    waypoints: [
      { lat: 34.4367, lng: 35.8497 },
      { lat: 34.5500, lng: 36.0200 },
    ]
  },
  {
    name: 'Beirut → Sidon', nameAr: 'بيروت ← صيدا',
    from: 'Beirut', to: 'Sidon', fromAr: 'بيروت', toAr: 'صيدا',
    priceMin: 30000, priceMax: 50000,
    frequencyLabel: 'Every 20 min', frequencyLabelAr: 'كل ٢٠ دقيقة',
    active: true, color: '#A855F7',
    waypoints: [
      { lat: 33.8938, lng: 35.5018 },
      { lat: 33.5610, lng: 35.3711 },
    ]
  },
  {
    name: 'Beirut → Zahle', nameAr: 'بيروت ← زحلة',
    from: 'Beirut', to: 'Zahle', fromAr: 'بيروت', toAr: 'زحلة',
    priceMin: 40000, priceMax: 60000,
    frequencyLabel: 'Every 45 min', frequencyLabelAr: 'كل ٤٥ دقيقة',
    active: true, color: '#EF4444',
    waypoints: [
      { lat: 33.8938, lng: 35.5018 },
      { lat: 33.8500, lng: 35.9000 },
    ]
  },
];

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private firestore = inject(Firestore);

  getRoutes(): Observable<Route[]> {
    const col = collection(this.firestore, 'routes');
    const q = query(col, where('active', '==', true));
    return collectionData(q, { idField: 'id' }) as Observable<Route[]>;
  }

  getRoute(id: string): Observable<Route | undefined> {
    const ref = doc(this.firestore, 'routes', id);
    return docData(ref, { idField: 'id' }) as Observable<Route | undefined>;
  }

  async seedRoutes(): Promise<void> {
    const col = collection(this.firestore, 'routes');
    for (const route of SEED_ROUTES) {
      await addDoc(col, route);
    }
    console.log('Routes seeded!');
  }
}
