import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SEOService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  private readonly APP_TITLE = 'Lebanon Bus';
  private readonly SITE_URL = 'https://leb-bus.web.app';

  async updateTags(titleKey?: string, descriptionKey?: string, config?: { image?: string, url?: string }) {
    const [title, description] = await Promise.all([
      titleKey ? firstValueFrom(this.translate.get(titleKey)) : Promise.resolve(this.APP_TITLE),
      descriptionKey ? firstValueFrom(this.translate.get(descriptionKey)) : Promise.resolve(''),
    ]);
    const pageUrl = config?.url ?? (this.document.defaultView?.location.href ?? this.SITE_URL);
    const currentLang = this.translate.currentLang || 'en';
    const locale = currentLang === 'ar' ? 'ar_LB' : 'en_LB';

    const fullTitle = titleKey ? `${title} | ${this.APP_TITLE}` : this.APP_TITLE;
    this.title.setTitle(fullTitle);

    // Standard
    this.updateMetaTag('description', description);
    this.updateMetaTag('robots', 'index, follow');

    // OpenGraph
    this.updateMetaTag('og:site_name', this.APP_TITLE);
    this.updateMetaTag('og:title', fullTitle);
    this.updateMetaTag('og:description', description);
    this.updateMetaTag('og:type', 'website');
    this.updateMetaTag('og:url', pageUrl);
    this.updateMetaTag('og:locale', locale);
    if (config?.image) this.updateMetaTag('og:image', config.image);

    // Twitter
    this.updateMetaTag('twitter:card', 'summary_large_image');
    this.updateMetaTag('twitter:title', fullTitle);
    this.updateMetaTag('twitter:description', description);
    if (config?.image) this.updateMetaTag('twitter:image', config.image);

    // Canonical
    this.setCanonical(pageUrl);
  }

  private updateMetaTag(name: string, content: string) {
    if (!content) return;
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      this.meta.updateTag({ property: name, content });
    } else {
      this.meta.updateTag({ name, content });
    }
  }

  private setCanonical(url: string) {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
