import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OdontogramaActionsComponent } from '../odontograma-actions/odontograma-actions.component';
import { OdontogramaFormComponent } from '../odontograma-form/odontograma-form.component';
import { PeriodontogramaFormComponent } from '../periodontograma-form/periodontograma-form.component';
import { OdontogramaCommentComponent } from '../odontograma-comment/odontograma-comment.component';

type DentalFormMode = 'odontograma' | 'periodontograma';

@Component({
  selector: 'app-odontograma-view',
  standalone: true,
  imports: [
    CommonModule,
    OdontogramaFormComponent,
    PeriodontogramaFormComponent,
    OdontogramaActionsComponent,
    OdontogramaCommentComponent,
  ],
  templateUrl: './odontograma-view.component.html',
  styleUrls: ['./odontograma-view.component.scss']
})
export class OdontogramaViewComponent {
  activeForm: DentalFormMode = 'odontograma';

  setActiveForm(mode: DentalFormMode): void {
    this.activeForm = mode;
  }
}
