import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-odontograma-comment-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './odontograma-comment.component.html',
  styleUrls: ['./odontograma-comment.component.scss']
})
export class OdontogramaCommentComponent {
  @Input() title = '';
  @Input() text = '';
  @Input() rows = 3;
}
