import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { IUser } from '../../Interfaces/IUser';
import { UserService } from '../../services/user-service';

import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    AvatarModule,
    AvatarGroupModule,
    ButtonModule,
    DialogModule,
    MenuModule,
    FloatLabelModule,
    InputTextModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  currentUser: IUser | null = null;
  displayDialogCriarCliente = false;
  clienteNome = '';
  clienteEmail = '';
  clienteSenha = '';
  submittingCliente = false;

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userService.user$.subscribe(user => {
      this.currentUser = user;
    });
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  get userInitials(): string {
    const name = this.currentUser?.name?.trim() || '';
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.length >= 2 ? name.slice(0, 2).toUpperCase() : name[0].toUpperCase();
  }

  logout(): void {
    this.userService.clearUser();
    this.router.navigate(['/']);
  }

  userMenuItems = [
    { label: 'Sair', icon: 'pi pi-sign-out', command: () => this.logout() }
  ];

  openDialogCriarCliente(): void {
    this.clienteNome = '';
    this.clienteEmail = '';
    this.clienteSenha = '';
    this.displayDialogCriarCliente = true;
  }

  closeDialogCriarCliente(): void {
    this.displayDialogCriarCliente = false;
  }

  onSubmitCriarCliente(): void {
    if (!this.clienteNome?.trim() || !this.clienteEmail?.trim() || !this.clienteSenha) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Preencha nome, email e senha.'
      });
      return;
    }
    this.submittingCliente = true;
    this.userService.createCliente(this.clienteNome.trim(), this.clienteEmail.trim(), this.clienteSenha).subscribe({
      next: () => {
        this.submittingCliente = false;
        this.closeDialogCriarCliente();
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: 'Cliente criado com sucesso.'
        });
      },
      error: (err) => {
        this.submittingCliente = false;
        const msg = err?.error?.error || 'Erro ao criar cliente. Tente novamente.';
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: msg });
      }
    });
  }
}
