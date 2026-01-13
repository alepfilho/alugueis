import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DisableButton } from '../../disable-button';
import { Router } from '@angular/router';
import { UserService } from '../../services/user-service';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login',
  imports: [FormsModule, DisableButton, InputTextModule, FloatLabelModule, ToastModule],
  providers: [MessageService],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  constructor(
    private router: Router, 
    private userService: UserService,
    private messageService: MessageService
  ) { }
  
  submitted = signal(false);
  email = '';
  password = '';

  onSubmit() {
    if (!this.email || !this.password) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Por favor, preencha todos os campos'
      });
      return;
    }

    this.submitted.set(true);

    this.userService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response) => {
        // Armazena o token
        this.userService.setToken(response.token);
        // Armazena o usuário
        this.userService.setUser(response.user);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: response.message
        });

        // Navega para a home após um pequeno delay para mostrar a mensagem
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 500);
      },
      error: (error) => {
        this.submitted.set(false);
        
        let errorMessage = 'Erro ao realizar login. Tente novamente.';
        
        if (error?.error?.error) {
          errorMessage = error.error.error;
        } else if (error?.status === 401) {
          errorMessage = 'Email ou senha inválidos';
        } else if (error?.status === 0) {
          errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.';
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: errorMessage
        });
      }
    });
  }
}
