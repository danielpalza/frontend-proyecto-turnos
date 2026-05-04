import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LeyendaItem {
  label: string;
  icono: string;
}

@Injectable({ providedIn: 'root' })
export class OdontogramaSelectionService {
  private readonly selectedToothSubject = new BehaviorSubject<number | null>(null);
  readonly selectedTooth$ = this.selectedToothSubject.asObservable();

  private readonly toothIconsSubject = new BehaviorSubject<Record<number, LeyendaItem[]>>({});
  readonly toothIcons$ = this.toothIconsSubject.asObservable();

  selectTooth(tooth: number | null): void {
    this.selectedToothSubject.next(tooth);
  }

  getSelectedTooth(): number | null {
    return this.selectedToothSubject.value;
  }

  toggleItemForSelectedTooth(item: LeyendaItem, checked: boolean): void {
    const selectedTooth = this.selectedToothSubject.value;
    if (!selectedTooth) {
      return;
    }

    const currentState = this.toothIconsSubject.value;
    const currentItems = currentState[selectedTooth] ?? [];
    const alreadySelected = currentItems.some(existing => existing.label === item.label);

    let nextItems = currentItems;
    if (checked && !alreadySelected) {
      nextItems = [...currentItems, item];
    } else if (!checked && alreadySelected) {
      nextItems = currentItems.filter(existing => existing.label !== item.label);
    }

    this.toothIconsSubject.next({
      ...currentState,
      [selectedTooth]: nextItems
    });
  }

  isItemSelectedForCurrentTooth(label: string): boolean {
    const selectedTooth = this.selectedToothSubject.value;
    if (!selectedTooth) {
      return false;
    }

    const toothItems = this.toothIconsSubject.value[selectedTooth] ?? [];
    return toothItems.some(item => item.label === label);
  }

  getIconsForTooth(tooth: number): LeyendaItem[] {
    return this.toothIconsSubject.value[tooth] ?? [];
  }

  removeItemsByLabelsForSelectedTooth(labels: string[]): void {
    const selectedTooth = this.selectedToothSubject.value;
    if (!selectedTooth) {
      return;
    }

    const currentState = this.toothIconsSubject.value;
    const currentItems = currentState[selectedTooth] ?? [];
    const nextItems = currentItems.filter(item => !labels.includes(item.label));

    this.toothIconsSubject.next({
      ...currentState,
      [selectedTooth]: nextItems
    });
  }
}
