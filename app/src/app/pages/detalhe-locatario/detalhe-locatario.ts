import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ILocatario } from '../../Interfaces/Ilocatario';
import { IAlugueis } from '../../Interfaces/IAlugueis';

@Component({
  selector: 'app-detalhe-locatario',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    AutoCompleteModule
  ],
  templateUrl: './detalhe-locatario.html',
  styleUrl: './detalhe-locatario.css',
})
export class DetalheLocatarioComponent implements OnInit {
  locatarioForm!: FormGroup;
  locatario: ILocatario = {
    id: 'uuid-aqui',
    nome: 'Alexandre Poltronieri',
    telefone: 11988111524,
    email: 'alexandrepoltronieri@gmail.com',
    aluguel_id: 'uuid-aqui'
  };
  imoveis: IAlugueis[] = [];
  filteredImoveis: IAlugueis[] = [];
  selectedImovel: IAlugueis | null = null;
  editandoLocatario: boolean = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // Carregar lista de imóveis (aluguéis)
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

    // Inicializar lista filtrada com todos os imóveis
    this.filteredImoveis = [...this.imoveis];

    // Encontrar o imóvel selecionado baseado no aluguel_id
    this.selectedImovel = this.imoveis.find(imovel => imovel.id === this.locatario.aluguel_id) || null;

    this.locatarioForm = this.fb.group({
      id: [{ value: this.locatario.id, disabled: true }],
      nome: [this.locatario.nome, [Validators.required]],
      telefone: [this.locatario.telefone, [Validators.required]],
      email: [this.locatario.email, [Validators.required, Validators.email]],
      aluguel_id: [this.selectedImovel, [Validators.required]]
    });
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

  onSubmit(): void {
    if (this.locatarioForm.valid) {
      const selectedImovel = this.locatarioForm.get('aluguel_id')?.value;
      const formValue = {
        id: this.locatario.id,
        nome: this.locatarioForm.get('nome')?.value,
        telefone: this.locatarioForm.get('telefone')?.value,
        email: this.locatarioForm.get('email')?.value,
        aluguel_id: selectedImovel?.id || ''
      };
      console.log('Dados salvos:', formValue);
      // Aqui você pode adicionar a lógica para salvar os dados
    }
  }

  onCancel(): void {
    this.locatarioForm.reset();
    this.ngOnInit();
  }

  entrarModoEdicaoLocatario(): void {
    this.editandoLocatario = true;
    // Garantir que o formulário está inicializado
    if (!this.locatarioForm) {
      this.ngOnInit();
    }
  }

  cancelarEdicaoLocatario(): void {
    this.editandoLocatario = false;
    this.locatarioForm.reset();
    this.ngOnInit();
  }

  salvarEdicaoLocatario(): void {
    if (this.locatarioForm.valid) {
      const selectedImovel = this.locatarioForm.get('aluguel_id')?.value;
      this.locatario = {
        id: this.locatario.id,
        nome: this.locatarioForm.get('nome')?.value,
        telefone: this.locatarioForm.get('telefone')?.value,
        email: this.locatarioForm.get('email')?.value,
        aluguel_id: selectedImovel?.id || ''
      };
      // Atualizar o imóvel selecionado
      this.selectedImovel = selectedImovel;
      this.editandoLocatario = false;
      console.log('Dados salvos:', this.locatario);
      // Aqui você pode adicionar a lógica para salvar os dados
    }
  }
}
