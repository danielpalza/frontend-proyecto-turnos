import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaveOdontogramaDialogComponent } from '../save-odontograma-dialog/save-odontograma-dialog.component';

@Component({
  selector: 'app-odontograma-actions',
  standalone: true,
  imports: [CommonModule, SaveOdontogramaDialogComponent],
  templateUrl: './odontograma-actions.component.html',
  styleUrls: ['./odontograma-actions.component.scss']
})
export class OdontogramaActionsComponent {
  @Output() print = new EventEmitter<void>();
  
  showSaveDialog = false;

  handlePrint(): void {
    if (this.print.observers.length > 0) {
      this.print.emit();
    } else {
      window.print();
    }
  }

  openSaveDialog(): void {
    this.showSaveDialog = true;
  }

  onDialogChange(isOpen: boolean): void {
    this.showSaveDialog = isOpen;
  }
}

