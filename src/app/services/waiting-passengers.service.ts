import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc, deleteDoc, updateDoc,
  doc, query, where, serverTimestamp, Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WaitingPassenger } from '../models/waiting-passenger.model';

@Injectable({ providedIn: 'root' })
export class WaitingPassengersService {
  private firestore = inject(Firestore);

  getWaitingForRoute(routeId: string): Observable<WaitingPassenger[]> {
    const col = collection(this.firestore, 'waiting_passengers');
    const q = query(
      col,
      where('routeId', '==', routeId)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<WaitingPassenger[]>).pipe(
      map(passengers => {
        const now = new Date().getTime();
        return passengers.filter(p => p.expiresAt && p.expiresAt.toMillis() > now);
      })
    );
  }

  getAllActive(): Observable<WaitingPassenger[]> {
    const col = collection(this.firestore, 'waiting_passengers');
    return (collectionData(col, { idField: 'id' }) as Observable<WaitingPassenger[]>).pipe(
      map(passengers => {
        const now = new Date().getTime();
        return passengers.filter(p => p.expiresAt && p.expiresAt.toMillis() > now);
      })
    );
  }

  async addWaiting(
    routeId: string,
    location: { lat: number; lng: number },
    count: number,
    deviceId: string
  ): Promise<string> {
    const col = collection(this.firestore, 'waiting_passengers');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const docRef = await addDoc(col, {
      routeId,
      location,
      count,
      deviceId,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });
    return docRef.id;
  }

  async removeWaiting(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'waiting_passengers', id));
  }

  async updateWaitingCount(id: string, count: number): Promise<void> {
    const ref = doc(this.firestore, 'waiting_passengers', id);
    await updateDoc(ref, { count });
  }
}
