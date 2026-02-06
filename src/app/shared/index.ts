/**
 * Barrel export para elementos compartidos de la aplicación
 * 
 * Importa todos los componentes, directivas, pipes y otros elementos
 * reutilizables desde esta carpeta shared.
 * 
 * Ejemplo de uso:
 * import { SearchInputComponent, FormatDatePipe } from '@shared';
 * o
 * import { SearchInputComponent } from '../../shared';
 */

// Exportar componentes compartidos
export * from './components/search-input/search-input.component';
export {
  PatientFormComponent,
  getPatientFormConfig,
  OBRAS_SOCIALES
} from './components/patient-form/patient-form.component';
// export * from './components/loading-spinner/loading-spinner.component';

// Exportar pipes compartidos
// export * from './pipes/format-date.pipe';

// Exportar directivas compartidas
// export * from './directives/auto-focus.directive';

// Exportar validators compartidos
// export * from './validators/custom-validators';
