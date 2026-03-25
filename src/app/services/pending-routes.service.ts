import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class PendingRoutesService {
  private firestore = inject(Firestore);

  async submit(
    from: string,
    to: string,
    fromAr: string,
    toAr: string,
    deviceId: string,
  ): Promise<void> {
    const col = collection(this.firestore, 'pending_routes');
    await addDoc(col, { from, to, fromAr, toAr, deviceId, createdAt: serverTimestamp() });
  }
}
