import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, query, where, serverTimestamp, updateDoc
} from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { Driver } from '../models/driver.model';

@Injectable({ providedIn: 'root' })
export class DriversService {
  private firestore = inject(Firestore);

  getDriversByRoute(routeId: string): Observable<Driver[]> {
    const col = collection(this.firestore, 'drivers');
    const q = query(col, where('routeId', '==', routeId));
    return collectionData(q, { idField: 'id' }) as Observable<Driver[]>;
  }

  getDriver(id: string): Observable<Driver | undefined> {
    const ref = doc(this.firestore, 'drivers', id);
    return docData(ref, { idField: 'id' }) as Observable<Driver | undefined>;
  }

  getDriverByUid(uid: string): Observable<Driver[]> {
    const col = collection(this.firestore, 'drivers');
    const q = query(col, where('uid', '==', uid));
    return collectionData(q, { idField: 'id' }) as Observable<Driver[]>;
  }

  getDriverByPlate(plate: string): Observable<Driver[]> {
    const col = collection(this.firestore, 'drivers');
    const q = query(col, where('plateNumber', '==', plate));
    return collectionData(q, { idField: 'id' }) as Observable<Driver[]>;
  }

  getAllDrivers(): Observable<Driver[]> {
    const col = collection(this.firestore, 'drivers');
    return collectionData(col, { idField: 'id' }) as Observable<Driver[]>;
  }

  async registerDriver(driver: Omit<Driver, 'id' | 'rating' | 'ratingCount' | 'createdAt'>): Promise<string> {
    const col = collection(this.firestore, 'drivers');
    
    // Check if a driver with this plate already exists (e.g. created via Review by Plate)
    if (driver.plateNumber) {
      const q = query(col, where('plateNumber', '==', driver.plateNumber));
      const existing = await firstValueFrom(collectionData(q, { idField: 'id' }));
      
      if (existing && existing.length > 0) {
        const existingDriver = existing[0] as Driver;
        // If it's a placeholder (no UID or different UID), "take it over"
        await this.updateDriver(existingDriver.id!, {
          ...driver,
          isActive: true,
          // We don't overwrite rating/ratingCount/createdAt
        });
        return existingDriver.id!;
      }
    }

    const docRef = await addDoc(col, {
      ...driver,
      rating: 0,
      ratingCount: 0,
      isActive: true,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async updateDriver(id: string, data: Partial<Driver>): Promise<void> {
    const ref = doc(this.firestore, 'drivers', id);
    await updateDoc(ref, data);
  }

  async updateDriverRoute(id: string, routeId: string): Promise<void> {
    const ref = doc(this.firestore, 'drivers', id);
    await updateDoc(ref, { routeId });
  }
}
