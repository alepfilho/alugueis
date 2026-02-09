import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, IClienteListItem } from '../../services/user-service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-clientes-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    DialogModule,
    FloatLabelModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './clientes-component.html',
  styleUrl: './clientes-component.css',
})
export class ClientesComponent implements OnInit {
  clientes: IClienteListItem[] = [];
  displayEditDialog = false;
  editId: number | null = null;
  editNome = '';
  editEmail = '';
  editSenha = '';
  submitting = false;

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadClientes();
  }

  loadClientes(): void {
    this.userService.listClientes().subscribe({
      next: (data) => {
        this.clientes = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Erro ao carregar clientes.' });
      }
    });
  }

  openEdit(cliente: IClienteListItem): void {
    this.editId = cliente.id;
    this.editNome = cliente.name;
    this.editEmail = cliente.email;
    this.editSenha = '';
    this.displayEditDialog = true;
  }

  closeEdit(): void {
    this.displayEditDialog = false;
    this.editId = null;
  }

  saveEdit(): void {
    if (this.editId == null || !this.editNome?.trim() || !this.editEmail?.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Atenção', detail: 'Preencha nome e e-mail.' });
      return;
    }
    this.submitting = true;
    const body: { name: string; email: string; password?: string } = {
      name: this.editNome.trim(),
      email: this.editEmail.trim()
    };
    if (this.editSenha?.trim()) {
      body.password = this.editSenha;
    }
    this.userService.updateCliente(this.editId, body).subscribe({
      next: () => {
        this.submitting = false;
        this.closeEdit();
        this.loadClientes();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Cliente atualizado.' });
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.error || 'Erro ao atualizar cliente.';
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: msg });
      }
    });
  }

  confirmDesativar(cliente: IClienteListItem): void {
    this.confirmationService.confirm({
      message: `Desativar "${cliente.name}"? Todos os imóveis e inquilinos deste cliente serão excluídos.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desativar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deactivate(cliente.id),
    });
  }

  deactivate(id: number): void {
    this.userService.deactivateCliente(id).subscribe({
      next: () => {
        this.loadClientes();
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Cliente desativado.' });
      },
      error: (err) => {
        const msg = err?.error?.error || 'Erro ao desativar cliente.';
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: msg });
      }
    });
  }
}
