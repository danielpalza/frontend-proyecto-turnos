import { Component, OnDestroy, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigurationService } from '../../../core/services/configuration.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-configuraciones-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuraciones-view.component.html',
  styleUrls: ['./configuraciones-view.component.scss']
})
export class ConfiguracionesViewComponent implements OnInit, OnDestroy {
  whatsappTemplate = '';
  whatsappSaved = false;
  readonly whatsappMaxLength = 1024;
  readonly whatsappPlaceholder = 'Hola {paciente}, te hablamos de Clinica del Oeste, te recordamos que tenes un turno el día {fecha} a las {hora} con el profesional {profesional}.\n\nEn caso de cualquier eventualidad te pedimos que nos contactes por este medio.\n\n¡Muchas gracias!';
  readonly whatsappPreviewData = {
    hora: '10:30',
    fecha: '15/07/2026',
    profesional: 'Diego Suarez',
    paciente: 'María García'
  } as const;
  readonly whatsappPlaceholderOptions = [
    { key: 'paciente' as const, label: 'Paciente', icon: 'bi-person' },
    { key: 'fecha' as const, label: 'Fecha', icon: 'bi-calendar3' },
    { key: 'hora' as const, label: 'Hora', icon: 'bi-clock' },
    { key: 'profesional' as const, label: 'Profesional', icon: 'bi-heart-pulse' }
  ];

  @ViewChild('whatsappTemplateInput') whatsappTemplateInput?: ElementRef<HTMLTextAreaElement>;

  private subscriptions = new Subscription();

  constructor(
    private configurationService: ConfigurationService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.whatsappTemplate = this.configurationService.getMensajeWhatsapp();
    this.subscriptions.add(
      this.configurationService.getConfig().subscribe({
        next: (cfg) => {
          if (cfg?.mensajeWhatsapp) {
            this.whatsappTemplate = cfg.mensajeWhatsapp;
            this.cdr.markForCheck();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get whatsappCharCount(): number {
    return this.whatsappTemplate?.length ?? 0;
  }

  get whatsappCharPercent(): number {
    return Math.min(100, (this.whatsappCharCount / this.whatsappMaxLength) * 100);
  }

  get whatsappCharsRemaining(): number {
    return this.whatsappMaxLength - this.whatsappCharCount;
  }

  get whatsappPreviewParts(): Array<{ text: string; highlight: boolean }> {
    const template = this.whatsappTemplate ?? '';
    const parts: Array<{ text: string; highlight: boolean }> = [];
    const pattern = /\{(hora|fecha|profesional|paciente)\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(template)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: template.slice(lastIndex, match.index), highlight: false });
      }
      const key = match[1] as keyof typeof this.whatsappPreviewData;
      parts.push({ text: this.whatsappPreviewData[key], highlight: true });
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < template.length) {
      parts.push({ text: template.slice(lastIndex), highlight: false });
    }

    return parts;
  }

  insertWhatsappPlaceholder(key: keyof typeof this.whatsappPreviewData): void {
    const token = `{${key}}`;
    const textarea = this.whatsappTemplateInput?.nativeElement;
    const current = this.whatsappTemplate ?? '';

    if (!textarea) {
      this.whatsappTemplate = (current + token).slice(0, this.whatsappMaxLength);
      return;
    }

    const start = textarea.selectionStart ?? current.length;
    const end = textarea.selectionEnd ?? start;
    const nextValue = (current.slice(0, start) + token + current.slice(end)).slice(0, this.whatsappMaxLength);
    this.whatsappTemplate = nextValue;

    setTimeout(() => {
      textarea.focus();
      const cursor = Math.min(start + token.length, nextValue.length);
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  restoreDefaultWhatsappTemplate(): void {
    this.whatsappTemplate = this.whatsappPlaceholder;
  }

  saveWhatsappTemplate(): void {
    this.configurationService.saveMensajeWhatsapp(this.whatsappTemplate).subscribe({
      next: () => {
        this.whatsappSaved = true;
        setTimeout(() => { this.whatsappSaved = false; }, 3000);
      },
      error: (err: unknown) => {
        const message = this.errorHandler.getErrorMessage(err, 'guardar la configuracion del mensaje');
        if (!this.errorHandler.isNetworkError(err as any)) {
          this.notification.showError(message);
        }
      }
    });
  }
}
