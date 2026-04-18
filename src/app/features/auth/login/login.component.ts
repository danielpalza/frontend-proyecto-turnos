import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoginRequest, RegisterRequest } from '../../../core/models/auth.model';

type RegisterStep = 'role' | 'details' | 'account';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  isLoginMode = true;
  loading = false;
  errorMessage = '';

  loginData: LoginRequest = { username: '', password: '' };

  registerStep: RegisterStep = 'role';
  selectedRole: 'PROFESIONAL' | 'RECEPCIONISTA' | null = null;

  registerData: RegisterRequest = {
    username: '', email: '', password: '', role: '',
    nombre: '', dni: '', telefono: '',
    direccion: '', localidad: '',
    especialidad: '', matricula: ''
  };
  confirmPassword = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/turnos']);
    }
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.registerStep = 'role';
    this.selectedRole = null;
  }

  selectRole(role: 'PROFESIONAL' | 'RECEPCIONISTA'): void {
    this.selectedRole = role;
    this.errorMessage = '';
  }

  nextStep(): void {
    this.errorMessage = '';

    if (this.registerStep === 'role') {
      if (!this.selectedRole) {
        this.errorMessage = 'Seleccione un tipo de cuenta';
        return;
      }
      this.registerData.role = this.selectedRole;
      this.registerStep = 'details';
      return;
    }

    if (this.registerStep === 'details') {
      if (!this.registerData.nombre.trim()) {
        this.errorMessage = 'El nombre completo es obligatorio';
        return;
      }
      if (this.selectedRole === 'PROFESIONAL' && !this.registerData.matricula?.trim()) {
        this.errorMessage = 'La matrícula es obligatoria para profesionales';
        return;
      }
      this.registerStep = 'account';
    }
  }

  prevStep(): void {
    this.errorMessage = '';
    if (this.registerStep === 'account') {
      this.registerStep = 'details';
    } else if (this.registerStep === 'details') {
      this.registerStep = 'role';
    }
  }

  onLogin(): void {
    if (this.loading) return;

    if (!this.loginData.username || !this.loginData.password) {
      this.errorMessage = 'Complete todos los campos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.login(this.loginData).subscribe({
      next: () => {
        this.router.navigate(['/turnos']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err, 'Error al iniciar sesión');
        this.notification.showError(this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  onRegister(): void {
    if (this.loading) return;

    if (!this.registerData.username || !this.registerData.email || !this.registerData.password) {
      this.errorMessage = 'Complete todos los campos obligatorios';
      return;
    }
    if (this.registerData.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }
    if (this.registerData.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.register(this.registerData).subscribe({
      next: () => {
        this.router.navigate(['/turnos']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(err, 'Error al registrarse');
        this.notification.showError(this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }

  private extractErrorMessage(err: HttpErrorResponse, fallback: string): string {
    if (!err) return fallback;
    const body = err.error;
    if (typeof body === 'string') return body || fallback;
    if (body?.message) return body.message;
    if (body?.error && typeof body.error === 'string') return body.error;
    if (err.status === 0) return 'No se pudo conectar con el servidor. Verifique su conexión.';
    return fallback;
  }
}
