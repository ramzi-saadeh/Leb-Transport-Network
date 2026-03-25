import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { provideTranslateHttpLoader, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideTranslateService } from '@ngx-translate/core';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

// Factory function required by TranslateModule
export function HttpLoaderFactory() {
  return new TranslateHttpLoader();
}


const firebaseConfig = {
  apiKey: "AIzaSyA2qm5RvKvYEv38tr2e8JOItlmsWGU7pkg",
  authDomain: "leb-bus.firebaseapp.com",
  projectId: "leb-bus",
  storageBucket: "leb-bus.firebasestorage.app",
  messagingSenderId: "913055164085",
  appId: "1:913055164085:web:51f3fc6d24a0f2bdcf80fc",
  measurementId: "G-7F6T631LC8"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'en',
    }),
  ]
};

