import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { AdminService } from '../../admin.service';
import { ADMIN_ROLE_OPTIONS, AdminUserDTO, OrganizationAdminDTO } from '../../admin.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { BodyPortalDirective } from '../../../../shared/directives/body-portal.directive';
import { ScrollLockDirective } from '../../../../shared/directives/scroll-lock.directive';
import { ConfirmDialogComponent } from '../../../appointments/components/confirm-dialog/confirm-dialog.component';

interface PendingRoleChange {
  user: AdminUserDTO;
  select: HTMLSelectElement;
  previousRole: string;
  nextRole: string;
}

@Component({
  selector: 'app-admin-organization-users-dialog',
  standalone: true,
  imports: [CommonModule, BodyPortalDirective, ScrollLockDirective, ConfirmDialogComponent],
  templateUrl: './admin-organization-users-dialog.component.html',
  styleUrls: ['./admin-organization-users-dialog.component.scss']
})
export class AdminOrganizationUsersDialogComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() organization: OrganizationAdminDTO | null = null;

  @Output() openChange = new EventEmitter<boolean>();

  readonly roleOptions = ADMIN_ROLE_OPTIONS;
  users: AdminUserDTO[] = [];
  isLoading = false;
  togglingUserId: string | null = null;
  updatingRoleUserId: string | null = null;

  pendingToggleUser: AdminUserDTO | null = null;
  pendingRoleChange: PendingRoleChange | null = null;

  private loadedOrgId: string | null = null;
  private readonly loadRequests = new Subject<string>();
  private readonly subscription: Subscription;

  constructor(
    private adminService: AdminService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService,
    private cdr: ChangeDetectorRef
  ) {
    // switchMap descarta la respuesta de la organización anterior si se abre otra antes de que
    // llegue (cambiar de organización rápido no debe pisar la lista con datos de otra org).
    this.subscription = this.loadRequests.pipe(
      switchMap((orgId) => this.adminService.listarUsuarios(orgId).pipe(
        catchError((err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'cargar los usuarios');
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
          return of<AdminUserDTO[] | null>(null);
        })
      ))
    ).subscribe((list) => {
      this.isLoading = false;
      if (list !== null) this.users = list;
      this.cdr.markForCheck();
    });
  }

  ngOnChanges(): void {
    const orgId = this.open ? this.organization?.id : undefined;
    if (!orgId) {
      if (!this.open) this.loadedOrgId = null;
      return;
    }
    if (orgId === this.loadedOrgId) return;
    this.loadedOrgId = orgId;
    this.users = [];
    this.isLoading = true;
    this.loadRequests.next(orgId);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private replaceUser(updated: AdminUserDTO): void {
    const index = this.users.findIndex(u => u.id === updated.id);
    if (index !== -1) {
      this.users = [...this.users.slice(0, index), updated, ...this.users.slice(index + 1)];
    }
  }

  // --- Toggle activo/inactivo -----------------------------------------------------------------

  requestToggleUserActive(user: AdminUserDTO): void {
    if (this.togglingUserId) return;
    this.pendingToggleUser = user;
  }

  cancelToggleUserActive(): void {
    if (this.togglingUserId) return;
    this.pendingToggleUser = null;
  }

  onToggleUserActiveOpenChange(open: boolean): void {
    if (!open) this.cancelToggleUserActive();
  }

  confirmToggleUserActive(): void {
    const user = this.pendingToggleUser;
    if (!user || !this.organization || this.togglingUserId) return;
    this.togglingUserId = user.id;
    this.adminService.toggleUsuarioActivo(this.organization.id, user.id)
      .pipe(finalize(() => { this.togglingUserId = null; }))
      .subscribe({
        next: (updated) => {
          this.replaceUser(updated);
          this.notification.showSuccess(
            updated.activo ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.'
          );
          this.pendingToggleUser = null;
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'cambiar el estado del usuario');
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
          this.pendingToggleUser = null;
          this.cdr.markForCheck();
        }
      });
  }

  // --- Cambio de rol ----------------------------------------------------------------------------

  onRoleChange(user: AdminUserDTO, event: Event): void {
    if (!this.organization) return;
    const select = event.target as HTMLSelectElement;
    const nextRole = select.value;
    const previousRole = user.role;
    if (nextRole === previousRole) return;
    this.pendingRoleChange = { user, select, previousRole, nextRole };
  }

  roleLabel(code: string): string {
    return this.roleOptions.find(r => r.code === code)?.label ?? code;
  }

  get pendingRoleChangeSummary(): string | null {
    const change = this.pendingRoleChange;
    if (!change) return null;
    return `${change.user.nombre} ${change.user.apellido}: ${this.roleLabel(change.previousRole)} → ${this.roleLabel(change.nextRole)}`;
  }

  cancelRoleChange(): void {
    if (this.updatingRoleUserId) return;
    const change = this.pendingRoleChange;
    // Asignación programática: no dispara otro evento 'change', solo revierte el <select> nativo.
    if (change) change.select.value = change.previousRole;
    this.pendingRoleChange = null;
  }

  onRoleChangeOpenChange(open: boolean): void {
    if (!open) this.cancelRoleChange();
  }

  confirmRoleChange(): void {
    const change = this.pendingRoleChange;
    if (!change || !this.organization || this.updatingRoleUserId) return;
    this.updatingRoleUserId = change.user.id;
    this.adminService.actualizarRolUsuario(this.organization.id, change.user.id, change.nextRole)
      .pipe(finalize(() => { this.updatingRoleUserId = null; }))
      .subscribe({
        next: (updated) => {
          this.replaceUser(updated);
          this.notification.showSuccess('Rol actualizado correctamente.');
          this.pendingRoleChange = null;
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          change.select.value = change.previousRole;
          const message = this.errorHandler.getErrorMessage(err as any, 'cambiar el rol del usuario');
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
          this.pendingRoleChange = null;
          this.cdr.markForCheck();
        }
      });
  }

  close(): void {
    this.openChange.emit(false);
  }
}
