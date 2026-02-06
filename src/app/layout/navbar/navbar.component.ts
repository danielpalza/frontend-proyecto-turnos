import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

export type ViewType = 'turnos' | 'odontograma' | 'seguimiento' | 'configuraciones';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  constructor(private router: Router) {}

  menuItems = [
    { title: 'Turnos', icon: 'bi-calendar', route: '/turnos' },
    { title: 'Odontograma', icon: 'bi-heart-pulse', route: '/odontograma' },
    { title: 'Seguimiento', icon: 'bi-clipboard-data', route: '/seguimiento' },
    { title: 'Configuraciones', icon: 'bi-gear', route: '/configuraciones' }
  ];
}

