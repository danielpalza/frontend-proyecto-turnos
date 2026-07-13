import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoginRequest, RegisterRequest } from '../../../core/models/auth.model';

type RegisterStep = 'org' | 'account';

const PATTERNS = {
  onlyLetters: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/,
  onlyNumbers: /^[0-9]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

const PAISES_LATAM = [
  { code: 'AR', nombre: 'Argentina' },
  { code: 'MX', nombre: 'México' },
  { code: 'CO', nombre: 'Colombia' },
  { code: 'CL', nombre: 'Chile' },
  { code: 'PE', nombre: 'Perú' },
  { code: 'EC', nombre: 'Ecuador' },
  { code: 'BO', nombre: 'Bolivia' },
  { code: 'PY', nombre: 'Paraguay' },
  { code: 'UY', nombre: 'Uruguay' },
  { code: 'VE', nombre: 'Venezuela' },
  { code: 'BR', nombre: 'Brasil' },
  { code: 'CR', nombre: 'Costa Rica' },
  { code: 'PA', nombre: 'Panamá' },
  { code: 'GT', nombre: 'Guatemala' },
  { code: 'HN', nombre: 'Honduras' },
  { code: 'SV', nombre: 'El Salvador' },
  { code: 'NI', nombre: 'Nicaragua' },
  { code: 'DO', nombre: 'República Dominicana' }
];

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

  readonly paisesLatam = PAISES_LATAM;

  loginData: LoginRequest = { username: '', password: '' };

  registerStep: RegisterStep = 'org';
  selectedOrgMode: 'new' | 'join' = 'new';
  invitationCode = '';

  registerData: RegisterRequest = {
    username: '',
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    dni: '',
    telefono: ''
  };
  confirmPassword = '';
  organizacionNombre = '';
  pais = '';

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
    this.registerStep = 'org';
    this.selectedOrgMode = 'new';
    this.registerData = {
      username: '', email: '', password: '',
      nombre: '', apellido: '', dni: '', telefono: ''
    };
    this.confirmPassword = '';
    this.organizacionNombre = '';
    this.pais = '';
    this.invitationCode = '';
  }

  selectOrgMode(mode: 'new' | 'join'): void {
    this.selectedOrgMode = mode;
    this.errorMessage = '';
    this.invitationCode = '';
    this.organizacionNombre = '';
    this.pais = '';
  }

  onFieldInput(field: string): void {
    delete this.fieldErrors[field];
  }

  nextStep(): void {
    this.errorMessage = '';
    this.fieldErrors = {};

    if (this.registerStep === 'org') {
      if (this.selectedOrgMode === 'new' && !this.organizacionNombre.trim()) {
        this.errorMessage = 'Ingresa el nombre de tu organización';
        return;
      }
      if (this.selectedOrgMode === 'new' && !this.pais.trim()) {
        this.errorMessage = 'Seleccioná el país de tu organización';
        return;
      }
      if (this.selectedOrgMode === 'join' && !this.invitationCode.trim()) {
        this.errorMessage = 'Ingresá el código de invitación que te compartieron';
        return;
      }
      this.registerStep = 'account';
      return;
    }
  }

  prevStep(): void {
    this.errorMessage = '';
    this.fieldErrors = {};
    if (this.registerStep === 'account') {
      this.registerStep = 'org';
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

    if (!this.registerData.nombre.trim()) {
      this.fieldErrors['nombre'] = 'El nombre es obligatorio';
    } else if (!PATTERNS.onlyLetters.test(this.registerData.nombre.trim())) {
      this.fieldErrors['nombre'] = 'Solo puede contener letras y espacios';
    }

    if (this.registerData.dni && this.registerData.dni.trim()) {
      if (!PATTERNS.onlyNumbers.test(this.registerData.dni.trim())) {
        this.fieldErrors['dni'] = 'Solo números';
      } else if (this.registerData.dni.trim().length > 8) {
        this.fieldErrors['dni'] = 'Máximo 8 dígitos';
      }
    }

    if (this.registerData.telefono && this.registerData.telefono.trim()) {
      if (!PATTERNS.onlyNumbers.test(this.registerData.telefono.trim())) {
        this.fieldErrors['telefono'] = 'Solo números';
      } else if (this.registerData.telefono.trim().length > 20) {
        this.fieldErrors['telefono'] = 'Máximo 20 dígitos';
      }
    }

    if (Object.keys(this.fieldErrors).length > 0) {
      this.errorMessage = 'Corrija los errores marcados';
      return;
    }

    if (this.selectedOrgMode === 'new') {
      this.registerData.organizacionNombre = this.organizacionNombre.trim();
      this.registerData.pais = this.pais.trim();
      delete this.registerData.invitationToken;
    } else {
      this.registerData.invitationToken = this.invitationCode.trim();
      delete this.registerData.organizacionNombre;
      delete this.registerData.pais;
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