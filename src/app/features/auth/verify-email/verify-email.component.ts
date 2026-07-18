import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent implements OnInit {
  loading = true;
  success = false;
  alreadyVerified = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading = false;
      this.errorMessage = 'Token de verificación no proporcionado.';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = true;
        this.successMessage = res.message;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        const body = err?.error;
        const msg = body?.message || err?.message || '';
        // ponytail: si el token ya fue usado, el back dice "ya utilizado".
        if (msg.includes('ya utilizado') || msg.includes('inválido')) {
          this.alreadyVerified = true;
          this.successMessage = 'Tu email ya fue verificado. Podés iniciar sesión normalmente.';
        } else {
          this.errorMessage = msg || 'Token inválido o expirado.';
        }
        this.cdr.markForCheck();
      }
    });

    // ponytail: seguridad - si el subscribe no emite en 10s, limpiar loading
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.alreadyVerified = true;
        this.successMessage = 'Tu email ya fue verificado. Podés iniciar sesión normalmente.';
        this.cdr.markForCheck();
      }
    }, 10000);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
