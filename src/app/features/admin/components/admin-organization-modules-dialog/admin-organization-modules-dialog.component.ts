import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MODULE_OPTIONS } from '../../../../core/models';
import { OrganizationAdminDTO } from '../../admin.models';
import { BodyPortalDirective } from '../../../../shared/directives/body-portal.directive';
import { ScrollLockDirective } from '../../../../shared/directives/scroll-lock.directive';

/** Coincide con los íconos de cada pestaña en app-navbar (mismo mapa que profesional-dialog). */
const MODULE_ICONS: Record<string, string> = {
  PANEL: 'bi-speedometer2',
  TURNOS: 'bi-calendar',
  ODONTOGRAMA: 'bi-heart-pulse',
  HISTORIA_CLINICA_FREE: 'bi-file-earmark-medical',
  SEGUIMIENTO: 'bi-clipboard-data',
  COBERTURA: 'bi-shield-check',
  CONFIGURACIONES: 'bi-gear'
};

@Component({
  selector: 'app-admin-organization-modules-dialog',
  standalone: true,
  imports: [CommonModule, BodyPortalDirective, ScrollLockDirective],
  templateUrl: './admin-organization-modules-dialog.component.html',
  styleUrls: ['./admin-organization-modules-dialog.component.scss']
})
export class AdminOrganizationModulesDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() organization: OrganizationAdminDTO | null = null;
  @Input() isSaving = false;
  @Input() saveError = '';

  @Output() openChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<string[]>();

  readonly moduleOptions = MODULE_OPTIONS;
  moduleCodes: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetState();
    }
  }

  private resetState(): void {
    this.moduleCodes = (this.organization?.modules ?? [])
      .filter(m => m.activo)
      .map(m => m.codigo);
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

  close(): void {
    this.openChange.emit(false);
  }

  handleSubmit(): void {
    if (this.isSaving) return;
    this.save.emit([...this.moduleCodes]);
  }
}
