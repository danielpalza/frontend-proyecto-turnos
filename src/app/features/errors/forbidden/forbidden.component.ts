import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { resolveHomeRoute } from '../../../core/auth/home-route';

/**
 * Pantalla 403. Reemplaza al redirect mudo a `/panel` que hacía el guard, y que terminaba en
 * `/login` cuando el usuario tampoco tenía ese módulo. Ver `docs/PERMISOS.md § 6.5`.
 */
@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './forbidden.component.html',
  styleUrls: ['./forbidden.component.scss']
})
export class ForbiddenComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  goHome(): void {
    this.router.navigateByUrl(resolveHomeRoute(c => this.auth.hasCapability(c)));
  }

  get hasSomewhereToGo(): boolean {
    return resolveHomeRoute(c => this.auth.hasCapability(c)) !== '/403';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
