import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc,
  doc, runTransaction, query, where, serverTimestamp
} from '@angular/fire/firestore';
import { Observable, firstValueFrom, map } from 'rxjs';
import { Rating } from '../models/rating.model';

@Injectable({ providedIn: 'root' })
export class RatingsService {
  private firestore = inject(Firestore);

  getRatingsForDriver(driverId: string): Observable<Rating[]> {
    const col = collection(this.firestore, 'ratings');
    const q = query(col, where('driverId', '==', driverId));
    return collectionData(q, { idField: 'id' }) as Observable<Rating[]>;
  }

  hasDeviceRated(driverId: string, deviceId: string): Observable<boolean> {
    const col = collection(this.firestore, 'ratings');
    const q = query(col, where('driverId', '==', driverId), where('deviceId', '==', deviceId));
    return collectionData(q).pipe(map(docs => docs.length > 0));
  }

  async rateDriver(driverId: string, rating: number, comment: string, deviceId: string, routeId?: string): Promise<void> {
    const col = collection(this.firestore, 'ratings');
    const alreadyRated = await firstValueFrom(this.hasDeviceRated(driverId, deviceId));
    if (alreadyRated) {
      throw new Error('ALREADY_RATED');
    }
    await addDoc(col, {
      driverId,
      deviceId,
      rating,
      comment,
      ...(routeId ? { routeId } : {}),
      createdAt: serverTimestamp(),
    });

    const driverRef = doc(this.firestore, 'drivers', driverId);
    await runTransaction(this.firestore, async (transaction) => {
      const driverSnap = await transaction.get(driverRef);
      if (!driverSnap.exists()) return;
      const data = driverSnap.data();
      const oldCount = data['ratingCount'] ?? 0;
      const oldRating = data['rating'] ?? 0;
      const newCount = oldCount + 1;
      const newRating = ((oldRating * oldCount) + rating) / newCount;
      transaction.update(driverRef, { rating: newRating, ratingCount: newCount });
    });
  }
}
