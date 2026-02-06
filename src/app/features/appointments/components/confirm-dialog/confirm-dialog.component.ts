import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  @Input() open: boolean = false;
  @Input() title: string = 'Confirmar acción';
  @Input() message: string = '¿Está seguro de que desea realizar esta acción?';
  @Input() summary: string | null = null;
  @Input() isLoading: boolean = false;
  @Input() confirmText: string = 'Confirmar';
  @Input() cancelText: string = 'Cancelar';
  @Input() confirmButtonClass: string = 'btn-danger';
  @Input() dialogId: string = 'confirmDialog';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() openChange = new EventEmitter<boolean>();

  onBackdropClick(): void {
    if (!this.isLoading) {
      this.close();
    }
  }

  onCloseClick(): void {
    if (!this.isLoading) {
      this.close();
    }
  }

  onCancelClick(): void {
    if (!this.isLoading) {
      this.cancel.emit();
      this.close();
    }
  }

  onConfirmClick(): void {
    if (!this.isLoading) {
      this.confirm.emit();
    }
  }

  private close(): void {
    this.openChange.emit(false);
  }
}
