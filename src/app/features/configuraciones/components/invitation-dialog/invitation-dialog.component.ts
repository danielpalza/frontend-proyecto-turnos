import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvitationService } from '../../../../core/services/invitation.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { OrganizationInvitation, MODULE_OPTIONS } from '../../../../core/models';
import { finalize } from 'rxjs/operators';
import { BodyPortalDirective } from '../../../../shared/directives/body-portal.directive';
import { ScrollLockDirective } from '../../../../shared/directives/scroll-lock.directive';

/** Coincide con los íconos de cada pestaña en app-navbar (mismo mapeo que profesional-dialog). */
const MODULE_ICONS: Record<string, string> = {
  PANEL: 'bi-speedometer2',
  TURNOS: 'bi-calendar',
  ODONTOGRAMA: 'bi-heart-pulse',
  SEGUIMIENTO: 'bi-clipboard-data',
  COBERTURA: 'bi-shield-check',
  CONFIGURACIONES: 'bi-gear'
};

@Component({
  selector: 'app-invitation-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, BodyPortalDirective, ScrollLockDirective],
  templateUrl: './invitation-dialog.component.html',
  styleUrls: ['./invitation-dialog.component.scss']
})
export class InvitationDialogComponent implements OnChanges {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  readonly moduleOptions = MODULE_OPTIONS;

  moduleCodes: string[] = [];
  expiresInDays: number | null = null;

  isCreating = false;
  createError = '';
  lastCreated: OrganizationInvitation | null = null;

  invitations: OrganizationInvitation[] = [];
  isLoadingInvitations = false;
  revokingId: string | null = null;

  constructor(
    private invitationService: InvitationService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetForm();
      this.loadInvitations();
    }
  }

  private resetForm(): void {
    this.moduleCodes = [];
    this.expiresInDays = null;
    this.createError = '';
    this.lastCreated = null;
  }

  private loadInvitations(): void {
    this.isLoadingInvitations = true;
    this.invitationService.findAll()
      .pipe(finalize(() => { this.isLoadingInvitations = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (list) => { this.invitations = list; },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'cargar las invitaciones');
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
        }
      });
  }

  moduleIcon(code: string): string {
    return MODULE_ICONS[code] || 'bi-app-indicator';
  }

  isModuleSelected(code: string): boolean {
    return this.moduleCodes.includes(code);
  }

  toggleModule(code: string): void {
    this.moduleCodes = this.isModuleSelected(code)
      ? this.moduleCodes.filter(c => c !== code)
      : [...this.moduleCodes, code];
  }

  generate(): void {
    if (this.isCreating) return;
    if (this.moduleCodes.length === 0) {
      this.createError = 'Seleccioná al menos un módulo para el usuario invitado';
      return;
    }
    this.isCreating = true;
    this.createError = '';
    this.invitationService.create({
      moduleCodes: [...this.moduleCodes],
      expiresInDays: this.expiresInDays ?? undefined
    })
      .pipe(finalize(() => { this.isCreating = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (invitation) => {
          this.lastCreated = invitation;
          this.moduleCodes = [];
          this.invitations = [invitation, ...this.invitations];
        },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'generar la invitación');
          this.createError = message;
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
        }
      });
  }

  async copyToken(token: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(token);
      this.notification.showSuccess('Código de invitación copiado.');
    } catch {
      this.notification.showError('No se pudo copiar el código. Copiálo manualmente.');
    }
  }

  revoke(invitation: OrganizationInvitation): void {
    if (this.revokingId) return;
    this.revokingId = invitation.id;
    this.invitationService.revoke(invitation.id)
      .pipe(finalize(() => { this.revokingId = null; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.invitations = this.invitations.map(i =>
            i.id === invitation.id ? { ...i, revokedAt: new Date().toISOString(), usable: false } : i
          );
          this.notification.showSuccess('Invitación revocada.');
        },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'revocar la invitación');
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
        }
      });
  }

  close(): void {
    this.openChange.emit(false);
  }
}
