import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ILocatario } from '../../Interfaces/Ilocatario';
import { LocatarioService } from '../../services/locatario-service';
import { ImovelService, IImovel } from '../../services/imovel-service';

@Component({
  selector: 'novo-locatario',
  imports: [
    ButtonModule,
    TableModule,
    TagModule,
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
  imoveis: IImovel[] = [];
  filteredImoveis: IImovel[] = [];
  selectedImovel: IImovel | null = null;

  constructor(
    private fb: FormBuilder,
    private locatarioService: LocatarioService,
    private imovelService: ImovelService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.imovelService.getAllImoveis().subscribe({
      next: (data) => {
        this.imoveis = data;
        this.filteredImoveis = [...this.imoveis];
      },
      error: (err) => console.error('Erro ao carregar imóveis:', err)
    });
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
        aluguel_id: selectedImovel?.id ?? null
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

  filterImoveis(event: { query?: string }): void {
    const query = (event?.query ?? '').toLowerCase();
    if (!query) {
      this.filteredImoveis = [...this.imoveis];
    } else {
      this.filteredImoveis = this.imoveis.filter(im =>
        (im.endereco ?? '').toLowerCase().includes(query)
      );
    }
  }

}
