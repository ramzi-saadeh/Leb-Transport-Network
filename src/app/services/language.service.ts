import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'en' | 'ar';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANG_KEY = 'app_lang';
  private readonly translate = inject(TranslateService);

  private currentLangSignal = signal<Language>(this.getInitialLanguage());
  readonly currentLang = this.currentLangSignal.asReadonly();
  readonly isRtl = computed(() => this.currentLang() === 'ar');

  constructor() {
    // Sync translate service on init
    this.translate.use(this.currentLangSignal());

    // Save preference when it changes
    effect(() => {
      const lang = this.currentLangSignal();
      localStorage.setItem(this.LANG_KEY, lang);
      this.translate.use(lang);
    });
  }

  setLanguage(lang: Language) {
    this.currentLangSignal.set(lang);
  }

  toggleLanguage() {
    this.setLanguage(this.currentLangSignal() === 'en' ? 'ar' : 'en');
  }

  private getInitialLanguage(): Language {
    const saved = localStorage.getItem(this.LANG_KEY) as Language;
    if (saved === 'en' || saved === 'ar') return saved;
    
    // Default to browser language if available, otherwise 'en'
    const browserLang = navigator.language.split('-')[0];
    return (browserLang === 'ar') ? 'ar' : 'en';
  }
}
