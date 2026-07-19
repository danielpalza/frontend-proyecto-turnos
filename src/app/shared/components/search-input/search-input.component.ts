import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Patient, Profesional } from '../../../core/models';
import { fullName } from '../../../core/utils/full-name.util';

export type SearchType = 'patient' | 'profesional' | 'both';

export interface SearchResult {
  type: 'patient' | 'profesional';
  item: Patient | Profesional;
}

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-input.component.html',
  styleUrls: ['./search-input.component.scss']
})
export class SearchInputComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patients: Patient[] = [];
  @Input() profesionales: Profesional[] = [];
  @Input() searchType: SearchType = 'both'; // 'patient' | 'profesional' | 'both'
  @Input() placeholder: string = 'Buscar por nombre, DNI o email...';
  @Input() selectedValue: string = ''; // Valor inicial del input
  @Input() showIcon: boolean = false; // Si mostrar icono en input-group
  @Input() debounceTime: number = 0; // Tiempo de debounce (0 = sin debounce)
  @Input() showPendingOnlyFilter: boolean = false; // Si mostrar checkbox "Solo con saldo pendiente"
  @Input() pendingOnly: boolean = false; // Valor inicial del checkbox saldo pendiente

  @Output() select = new EventEmitter<SearchResult>();
  @Output() clear = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>(); // Emite el término de búsqueda
  @Output() pendingOnlyChange = new EventEmitter<boolean>(); // Emite cuando cambia el filtro saldo pendiente

  searchTerm = '';
  showDropdown = false;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private elRef: ElementRef) {}

  ngOnInit(): void {
    this.searchTerm = this.selectedValue || '';

    if (this.debounceTime > 0) {
      this.setupSearchDebounce();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedValue'] && changes['selectedValue'].currentValue !== undefined) {
      this.searchTerm = changes['selectedValue'].currentValue || '';
    }
    if (changes['pendingOnly'] && changes['pendingOnly'].currentValue !== undefined) {
      this.pendingOnly = changes['pendingOnly'].currentValue;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(this.debounceTime),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchValue => {
      this.searchChange.emit(searchValue);
    });
  }

  onPendingOnlyChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.pendingOnly = checked;
    this.pendingOnlyChange.emit(checked);
  }

  onInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm = term;

    if (this.debounceTime > 0) {
      this.searchSubject.next(term);
    } else {
      this.searchChange.emit(term);
    }

    // Mostrar dropdown si hay resultados
    this.showDropdown = this.getFilteredResults().length > 0;
  }

  onFocus(event: FocusEvent): void {
    const value = (event.target as HTMLInputElement).value.trim();

    if (!value) {
      // Si no hay texto, mostrar todos los elementos disponibles según el tipo
      this.showDropdown = this.getFilteredResults().length > 0;
    } else {
      this.showDropdown = this.getFilteredResults().length > 0;
    }
  }

  onBlur(): void {
    // Pequeño delay para permitir que el mousedown del item se procese antes de cerrar
    setTimeout(() => {
      this.showDropdown = false;
    }, 10);
  }

  onClear(): void {
    this.searchTerm = '';
    this.showDropdown = false;
    this.searchChange.emit('');
    this.clear.emit();
  }

  onItemSelect(result: SearchResult): void {
    this.searchTerm = this.getDisplayValue(result.item, result.type);
    this.showDropdown = false;
    this.select.emit(result);
  }

  get filteredPatients(): Patient[] {
    if (this.searchType === 'profesional' || !this.patients) {
      return [];
    }

    // Si no hay término, devolver todos los pacientes
    if (!this.searchTerm) {
      return this.patients;
    }

    // Si hay término, filtrar
    const term = this.searchTerm.toLowerCase();
    return this.patients.filter(p => {
      const nombre = fullName(p.nombre, p.apellido).toLowerCase();
      const identificacion = (p.identificacion || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return nombre.includes(term) || identificacion.includes(term) || email.includes(term);
    });
  }

  get filteredProfesionales(): Profesional[] {
    if (this.searchType === 'patient' || !this.profesionales) {
      return [];
    }

    // Si no hay término, devolver todos los profesionales
    if (!this.searchTerm) {
      return this.profesionales;
    }

    // Si hay término, filtrar
    const term = this.searchTerm.toLowerCase();
    return this.profesionales.filter(p => {
      const nombre = fullName(p.nombre, p.apellido).toLowerCase();
      const especialidad = (p.especialidad || '').toLowerCase();
      return nombre.includes(term) || especialidad.includes(term);
    });
  }

  getFilteredResults(): SearchResult[] {
    const results: SearchResult[] = [];

    if (this.searchType === 'patient' || this.searchType === 'both') {
      this.filteredPatients.forEach(patient => {
        results.push({ type: 'patient', item: patient });
      });
    }

    if (this.searchType === 'profesional' || this.searchType === 'both') {
      this.filteredProfesionales.forEach(prof => {
        results.push({ type: 'profesional', item: prof });
      });
    }

    return results;
  }

  getDisplayValue(item: Patient | Profesional, type: 'patient' | 'profesional'): string {
    if (type === 'patient') {
      const patient = item as Patient;
      return fullName(patient.nombre, patient.apellido);
    } else {
      const prof = item as Profesional;
      return fullName(prof.nombre, prof.apellido);
    }
  }

  fullName(nombre?: string | null, apellido?: string | null): string {
    return fullName(nombre, apellido);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const searchContainer: HTMLElement | null =
      this.elRef.nativeElement.querySelector('.search-input-container');

    if (searchContainer && !searchContainer.contains(target)) {
      this.showDropdown = false;
    }
  }
}
