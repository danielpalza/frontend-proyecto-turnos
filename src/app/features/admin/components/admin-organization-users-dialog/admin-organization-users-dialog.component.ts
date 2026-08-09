import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { AdminService } from '../../admin.service';
import { ADMIN_ROLE_OPTIONS, AdminUserDTO, OrganizationAdminDTO } from '../../admin.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { BodyPortalDirective } from '../../../../shared/directives/body-portal.directive';
import { ScrollLockDirective } from '../../../../shared/directives/scroll-lock.directive';

@Component({
  selector: 'app-admin-organization-users-dialog',
  standalone: true,
  imports: [CommonModule, BodyPortalDirective, ScrollLockDirective],
  templateUrl: './admin-organization-users-dialog.component.html',
  styleUrls: ['./admin-organization-users-dialog.component.scss']
})
export class AdminOrganizationUsersDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() organization: OrganizationAdminDTO | null = null;

  @Output() openChange = new EventEmitter<boolean>();

  readonly roleOptions = ADMIN_ROLE_OPTIONS;
  users: AdminUserDTO[] = [];
  isLoading = false;
  togglingUserId: string | null = null;
  updatingRoleUserId: string | null = null;

  constructor(
    private adminService: AdminService,
    private notification: NotificationService,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.organization) {
      this.loadUsers(this.organization.id);
    }
  }

  private loadUsers(orgId: string): void {
    this.isLoading = true;
    this.adminService.listarUsuarios(orgId)
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: (list) => { this.users = list; },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'cargar los usuarios');
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
        }
      });
  }

  private replaceUser(updated: AdminUserDTO): void {
    const index = this.users.findIndex(u => u.id === updated.id);
    if (index !== -1) {
      this.users = [...this.users.slice(0, index), updated, ...this.users.slice(index + 1)];
    }
  }

  toggleUserActive(user: AdminUserDTO): void {
    if (!this.organization || this.togglingUserId) return;
    this.togglingUserId = user.id;
    this.adminService.toggleUsuarioActivo(this.organization.id, user.id)
      .pipe(finalize(() => { this.togglingUserId = null; }))
      .subscribe({
        next: (updated) => {
          this.replaceUser(updated);
          this.notification.showSuccess(
            updated.activo ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.'
          );
        },
        error: (err: unknown) => {
          const message = this.errorHandler.getErrorMessage(err as any, 'cambiar el estado del usuario');
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
        }
      });
  }

  onRoleChange(user: AdminUserDTO, event: Event): void {
    if (!this.organization) return;
    const select = event.target as HTMLSelectElement;
    const nextRole = select.value;
    const previousRole = user.role;
    if (nextRole === previousRole) return;

    this.updatingRoleUserId = user.id;
    this.adminService.actualizarRolUsuario(this.organization.id, user.id, nextRole)
      .pipe(finalize(() => { this.updatingRoleUserId = null; }))
      .subscribe({
        next: (updated) => {
          this.replaceUser(updated);
          this.notification.showSuccess('Rol actualizado correctamente.');
        },
        error: (err: unknown) => {
          select.value = previousRole;
          const message = this.errorHandler.getErrorMessage(err as any, 'cambiar el rol del usuario');
          if (!this.errorHandler.isNetworkError(err as any)) this.notification.showError(message);
        }
      });
  }

  close(): void {
    this.openChange.emit(false);
  }
}
