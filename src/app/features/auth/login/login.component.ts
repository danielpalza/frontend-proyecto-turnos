import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoginRequest, RegisterRequest } from '../../../core/models/auth.model';

type RegisterStep = 'role' | 'details' | 'account';

const PATTERNS = {
  onlyLetters: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/,
  onlyNumbers: /^[0-9]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

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
  fieldErrors: Record<string, string> = {};

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
    this.fieldErrors = {};
    this.registerStep = 'role';
    this.selectedRole = null;
    this.registerData = {
      username: '', email: '', password: '', role: '',
      nombre: '', dni: '', telefono: '',
      direccion: '', localidad: '',
      especialidad: '', matricula: ''
    };
    this.confirmPassword = '';
  }

  selectRole(role: 'PROFESIONAL' | 'RECEPCIONISTA'): void {
    this.selectedRole = role;
    this.errorMessage = '';
  }

  onFieldInput(field: string): void {
    delete this.fieldErrors[field];
  }

  nextStep(): void {
    this.errorMessage = '';
    this.fieldErrors = {};

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
      if (!this.validateDetailsStep()) return;
      this.registerStep = 'account';
    }
  }

  prevStep(): void {
    this.errorMessage = '';
    this.fieldErrors = {};
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
    this.fieldErrors = {};

    if (!this.registerData.username.trim()) {
      this.fieldErrors['username'] = 'El usuario es obligatorio';
    } else if (this.registerData.username.trim().length < 3) {
      this.fieldErrors['username'] = 'El usuario debe tener al menos 3 caracteres';
    }

    if (!this.registerData.email.trim()) {
      this.fieldErrors['email'] = 'El email es obligatorio';
    } else if (!PATTERNS.email.test(this.registerData.email)) {
      this.fieldErrors['email'] = 'Ingrese un email válido';
    }

    if (!this.registerData.password) {
      this.fieldErrors['password'] = 'La contraseña es obligatoria';
    } else if (this.registerData.password.length < 6) {
      this.fieldErrors['password'] = 'Mínimo 6 caracteres';
    }

    if (this.registerData.password && this.registerData.password !== this.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'Las contraseñas no coinciden';
    }

    if (Object.keys(this.fieldErrors).length > 0) {
      this.errorMessage = 'Corrija los errores marcados';
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

  private validateDetailsStep(): boolean {
    const d = this.registerData;

    if (!d.nombre.trim()) {
      this.fieldErrors['nombre'] = 'El nombre completo es obligatorio';
    } else if (!PATTERNS.onlyLetters.test(d.nombre.trim())) {
      this.fieldErrors['nombre'] = 'Solo puede contener letras y espacios';
    }

    if (d.dni && d.dni.trim()) {
      if (!PATTERNS.onlyNumbers.test(d.dni.trim())) {
        this.fieldErrors['dni'] = 'Solo números';
      } else if (d.dni.trim().length > 8) {
        this.fieldErrors['dni'] = 'Máximo 8 dígitos';
      }
    }

    if (d.telefono && d.telefono.trim()) {
      if (!PATTERNS.onlyNumbers.test(d.telefono.trim())) {
        this.fieldErrors['telefono'] = 'Solo números';
      } else if (d.telefono.trim().length > 20) {
        this.fieldErrors['telefono'] = 'Máximo 20 dígitos';
      }
    }

    if (this.selectedRole === 'PROFESIONAL') {
      if (d.especialidad && d.especialidad.trim() && !PATTERNS.onlyLetters.test(d.especialidad.trim())) {
        this.fieldErrors['especialidad'] = 'Solo puede contener letras y espacios';
      }
      if (!d.matricula?.trim()) {
        this.fieldErrors['matricula'] = 'La matrícula es obligatoria';
      }
    }

    if (this.selectedRole === 'RECEPCIONISTA') {
      if (d.localidad && d.localidad.trim() && !PATTERNS.onlyLetters.test(d.localidad.trim())) {
        this.fieldErrors['localidad'] = 'Solo puede contener letras y espacios';
      }
    }

    if (Object.keys(this.fieldErrors).length > 0) {
      this.errorMessage = 'Corrija los errores marcados';
      return false;
    }
    return true;
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
