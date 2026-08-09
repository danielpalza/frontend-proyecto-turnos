import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrganizationAdminDTO, OrganizationPlanUpdateDTO } from '../../admin.models';
import { BodyPortalDirective } from '../../../../shared/directives/body-portal.directive';
import { ScrollLockDirective } from '../../../../shared/directives/scroll-lock.directive';

@Component({
  selector: 'app-admin-organization-plan-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BodyPortalDirective, ScrollLockDirective],
  templateUrl: './admin-organization-plan-dialog.component.html',
  styleUrls: ['./admin-organization-plan-dialog.component.scss']
})
export class AdminOrganizationPlanDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() organization: OrganizationAdminDTO | null = null;
  @Input() isSaving = false;
  @Input() saveError = '';

  @Output() openChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<OrganizationPlanUpdateDTO>();

  readonly form: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetForm();
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      planNombre: [''],
      planPrecio: ['', Validators.min(0)],
      fechaContratacion: [''],
      fechaUltimoPago: ['']
    });
  }

  private resetForm(): void {
    const org = this.organization;
    this.form.reset({
      planNombre: org?.planNombre ?? '',
      planPrecio: org?.planPrecio ?? '',
      fechaContratacion: org?.fechaContratacion ?? '',
      fechaUltimoPago: org?.fechaUltimoPago ?? ''
    });
  }

  close(): void {
    this.openChange.emit(false);
  }

  handleSubmit(): void {
    if (this.isSaving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    const dto: OrganizationPlanUpdateDTO = {
      planNombre: value.planNombre || null,
      planPrecio: value.planPrecio === '' || value.planPrecio == null ? null : Number(value.planPrecio),
      fechaContratacion: value.fechaContratacion || null,
      fechaUltimoPago: value.fechaUltimoPago || null
    };
    this.save.emit(dto);
  }
}
