import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type SidebarTab = 'estado' | 'procedimientos';

interface StateOption {
  id: string;
  label: string;
  subcategories?: string[];
}

interface ProcedureOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-odontograma-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './odontograma-sidebar.component.html',
  styleUrls: ['./odontograma-sidebar.component.scss']
})
export class OdontogramaSidebarComponent {
  activeTab = signal<SidebarTab>('estado');
  selectedOptions = signal<Set<string>>(new Set());

  estadoOptions: StateOption[] = [
    { id: 'caries', label: 'Caries', subcategories: ['Incipiente', 'Activa', 'Profunda'] },
    { id: 'restauraciones', label: 'Restauraciones presentes', subcategories: ['Resina', 'Amalgama', 'Ionómero', 'Corona'] },
    { id: 'endodoncia', label: 'Endodoncia realizada' },
    { id: 'fisuras', label: 'Fisuras o microfracturas' },
    { id: 'ausente', label: 'Diente ausente' },
    { id: 'retenido', label: 'Diente retenido' },
    { id: 'supernumerario', label: 'Diente supernumerario' },
    { id: 'movilidad', label: 'Movilidad dental', subcategories: ['Grado I', 'Grado II', 'Grado III'] },
    { id: 'desgaste', label: 'Desgaste o abrasión' },
    { id: 'hipoplasia', label: 'Hipoplasia o alteraciones del esmalte' },
  ];

  procedimientosOptions: ProcedureOption[] = [
    { id: 'obturacion', label: 'Obturación / arreglo' },
    { id: 'endodoncia-proc', label: 'Endodoncia' },
    { id: 'corona', label: 'Colocación de corona/puente' },
    { id: 'selladores', label: 'Selladores' },
    { id: 'extracciones', label: 'Extracciones' },
    { id: 'implantes', label: 'Implantes' },
  ];

  setTab(tab: SidebarTab) {
    this.activeTab.set(tab);
  }

  toggleOption(optionId: string) {
    const set = new Set(this.selectedOptions());
    if (set.has(optionId)) set.delete(optionId);
    else set.add(optionId);
    this.selectedOptions.set(set);
  }

  clearOptions() {
    this.selectedOptions.set(new Set());
  }
}

