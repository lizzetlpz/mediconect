import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'appP',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive], // ← AGREGADO
  templateUrl: './Barrap.component.html',
  styleUrls: ['./Barrap.component.css']
})
export class PatientSidebarComponent implements OnInit {
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  getUserInitial(): string {
    return this.currentUser?.nombre?.charAt(0).toUpperCase() || 'P';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
