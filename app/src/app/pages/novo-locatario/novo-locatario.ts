import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { IAlugueis } from '../../Interfaces/IAlugueis';
import { ILocatario } from '../../Interfaces/Ilocatario';
import { LocatarioService } from '../../services/locatario-service';

@Component({
  selector: 'novo-locatario',
  imports: [
    ButtonModule,
    TableModule,
    TagModule,
    RouterLink,
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    AutoCompleteModule
  ],
  templateUrl: './novo-locatario.html',
  styleUrl: './novo-locatario.css',
})
export class NovoLocatarioComponent implements OnInit {
  locatarioForm!: FormGroup;
  locatario: ILocatario | null = null;
  imoveis: IAlugueis[] = [];
  filteredImoveis: IAlugueis[] = [];
  selectedImovel: IAlugueis | null = null;

  constructor(
    private fb: FormBuilder,
    private locatarioService: LocatarioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.imoveis = [
      {
        id: 'uuid-aqui',
        endereco: 'rua galvão bueno 485, ap 91',
        valor_aluguel: 1700.80,
        data_inicio: '10/01/2026',
        status_aluguel: true,
        status_iptu: false,
        status_condominio: true,
        inquilino: 'Alexanxre P Filho',
        inquilino_id: 'uuid'
      }
    ];
    this.filteredImoveis = [...this.imoveis];
    this.locatarioForm = this.fb.group({
      nome: ['', [Validators.required]],
      telefone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      aluguel_id: [null]
    });

  }

  onSubmit() {
    if (this.locatarioForm.valid) {
      const selectedImovel = this.locatarioForm.get('aluguel_id')?.value;
      
      const newLocatario = {
        nome: this.locatarioForm.get('nome')?.value,
        telefone: this.locatarioForm.get('telefone')?.value,
        email: this.locatarioForm.get('email')?.value,
        aluguel_id: selectedImovel?.id || null
      };

      // Criar locatário na API
      this.locatarioService.createLocatario(newLocatario).subscribe({
        next: (data) => {
          console.log('Locatário criado com sucesso:', data);
          // Redirecionar para a lista de locatários ou para os detalhes do novo locatário
          this.router.navigate(['/home/inquilinos']);
        },
        error: (error) => {
          console.error('Erro ao criar locatário:', error);
        }
      });
    }
  }

  filterImoveis(event: any): void {
    const query = event.query ? event.query.toLowerCase() : '';
    if (!query) {
      this.filteredImoveis = [...this.imoveis];
    } else {
      this.filteredImoveis = this.imoveis.filter(imovel =>
        imovel.endereco.toLowerCase().includes(query)
      );
    }
  }

}
