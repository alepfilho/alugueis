import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Converte markdown simples na resposta do Gemini: **texto** vira negrito.
 * Escapa HTML para evitar XSS.
 */
@Pipe({
  name: 'markdownBold',
  standalone: true,
})
export class MarkdownBoldPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (value == null || value === '') {
      return '';
    }
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const parts = escaped.split(/\*\*/);
    let html = '';
    for (let i = 0; i < parts.length; i++) {
      html += i % 2 === 1 ? `<strong>${parts[i]}</strong>` : parts[i];
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
