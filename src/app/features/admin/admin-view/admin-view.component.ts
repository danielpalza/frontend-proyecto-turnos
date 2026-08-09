import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AdminService } from '../admin.service';
import { OrganizationAdminDTO, OrganizationPlanUpdateDTO } from '../admin.models';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { PAISES_LATAM } from '../../../shared/constants/paises-latam';
import { AdminOrganizationPlanDialogComponent } from '../components/admin-organization-plan-dialog/admin-organization-plan-dialog.component';
import { AdminOrganizationModulesDialogComponent } from '../components/admin-organization-modules-dialog/admin-organization-modules-dialog.component';
import { AdminOrganizationUsersDialogComponent } from '../components/admin-organization-users-dialog/admin-organization-users-dialog.component';

@Component({
  selector: 'app-admin-view',
  standalone: true,
  imports: [
    CommonModule,
    AdminOrganizationPlanDialogComponent,
    AdminOrganizationModulesDialogComponent,
    AdminOrganizationUsersDialogComponent
  ],
  templateUrl: './admin-view.component.html',
  styleUrls: ['./admin-view.component.scss']
})
export class AdminViewComponent implements OnInit, OnDestroy {
  organizations: OrganizationAdminDTO[] = [];
  isTogglingActive = false;

  showPlanDialog = false;
  editingOrgForPlan: OrganizationAdminDTO | null = null;
  isSavingPlan = false;
  savePlanError = '';

  showModulesDialog = false;
  editingOrgForModules: OrganizationAdminDTO | null = null;
  isSavingModules = false;
  saveModulesError = '';

  showUsersDialog = false;
  usersDialogOrg: OrganizationAdminDTO | null = null;

  private subscriptions = new Subscription();

  constructor(
    private adminService: AdminService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.adminService.listarOrganizaciones().subscribe({
        next: (list) => { this.organizations = list; this.cdr.markForCheck(); },
        error: (err) => {
          const message = this.errorHandler.getErrorMessage(err, 'cargar las organizaciones');
          if (!this.errorHandler.isNetworkError(err)) this.notification.showError(message);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  paisNombre(codigo: string): string {
    return PAISES_LATAM.find(p => p.codigo === codigo)?.nombre ?? codigo;
  }

  planResumen(org: OrganizationAdminDTO): string {
    if (!org.planNombre && org.planPrecio == null) {
      return 'Sin plan asignado';
    }
    const partes: string[] = [];
    if (org.planNombre) partes.push(org.planNombre);
    if (org.planPrecio != null) partes.push(`$${org.planPrecio}`);
    return partes.join(' • ');
  }

  private replaceOrg(updated: OrganizationAdminDTO): void {
    const index = this.organizations.findIndex(o => o.id === updated.id);
    if (index !== -1) {
      this.organizations = [
        ...this.organizations.slice(0, index),
        updated,
        ...this.organizations.slice(index + 1)
      ];
    }
  }

  toggleOrgActive(org: OrganizationAdminDTO): void {
    if (this.isTogglingActive) return;
    this.isTogglingActive = true;
    this.adminService.toggleOrganizacionActiva(org.id)
      .pipe(finalize(() => { this.isTogglingActive = false; }))
      .subscribe({
        next: (updated) => {
          this.replaceOrg(updated);
          this.notification.showSuccess(
            updated.activa ? 'Organización activada correctamente.' : 'Organización desactivada correctamente.'
          );
        },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'cambiar el estado de la organización');
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
        }
      });
  }

  openPlanDialog(org: OrganizationAdminDTO): void {
    this.editingOrgForPlan = org;
    this.savePlanError = '';
    this.showPlanDialog = true;
  }

  closePlanDialog(): void {
    this.showPlanDialog = false;
    this.editingOrgForPlan = null;
    this.isSavingPlan = false;
  }

  onSavePlan(dto: OrganizationPlanUpdateDTO): void {
    if (this.isSavingPlan || !this.editingOrgForPlan) return;
    this.isSavingPlan = true;
    this.savePlanError = '';
    this.adminService.actualizarPlan(this.editingOrgForPlan.id, dto).subscribe({
      next: (updated) => {
        this.isSavingPlan = false;
        this.replaceOrg(updated);
        this.closePlanDialog();
        this.notification.showSuccess('Plan actualizado correctamente.');
      },
      error: (err: unknown) => {
        this.isSavingPlan = false;
        const message = this.errorHandler.getErrorMessage(err as any, 'actualizar el plan');
        this.savePlanError = message;
        if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
      }
    });
  }

  openModulesDialog(org: OrganizationAdminDTO): void {
    this.editingOrgForModules = org;
    this.saveModulesError = '';
    this.showModulesDialog = true;
  }

  closeModulesDialog(): void {
    this.showModulesDialog = false;
    this.editingOrgForModules = null;
    this.isSavingModules = false;
  }

  onSaveModules(moduleCodes: string[]): void {
    if (this.isSavingModules || !this.editingOrgForModules) return;
    this.isSavingModules = true;
    this.saveModulesError = '';
    this.adminService.actualizarModulos(this.editingOrgForModules.id, moduleCodes).subscribe({
      next: (updated) => {
        this.isSavingModules = false;
        this.replaceOrg(updated);
        this.closeModulesDialog();
        this.notification.showSuccess('Módulos actualizados correctamente.');
      },
      error: (err: unknown) => {
        this.isSavingModules = false;
        const message = this.errorHandler.getErrorMessage(err as any, 'actualizar los módulos');
        this.saveModulesError = message;
        if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
      }
    });
  }

  openUsersDialog(org: OrganizationAdminDTO): void {
    this.usersDialogOrg = org;
    this.showUsersDialog = true;
  }

  closeUsersDialog(): void {
    this.showUsersDialog = false;
    this.usersDialogOrg = null;
  }
}
