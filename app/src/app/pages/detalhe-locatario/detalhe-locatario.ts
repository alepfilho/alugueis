import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ILocatario } from '../../Interfaces/Ilocatario';
import { LocatarioService } from '../../services/locatario-service';
import { ImovelService, IImovel } from '../../services/imovel-service';

@Component({
  selector: 'app-detalhe-locatario',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    SelectModule
  ],
  templateUrl: './detalhe-locatario.html',
  styleUrl: './detalhe-locatario.css',
})
export class DetalheLocatarioComponent implements OnInit {
  locatarioForm!: FormGroup;
  locatario: ILocatario | null = null;
  imoveis: IImovel[] = [];
  filteredImoveis: IImovel[] = [];
  selectedImovel: IImovel | null = null;
  editandoLocatario: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private locatarioService: LocatarioService,
    private imovelService: ImovelService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Obter o ID da rota
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id) {
      const locatarioId = parseInt(id, 10);
      
      // Buscar locatário pela API
      this.locatarioService.getLocatarioById(locatarioId).subscribe({
        next: (data) => {
          this.locatario = data;
          this.initializeForm();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erro ao buscar locatário:', error);
        }
      });
    }

    // Carregar lista de imóveis da API
    this.imovelService.getAllImoveis().subscribe({
      next: (data) => {
        this.imoveis = data;
        if (this.locatario) this.initializeForm();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erro ao carregar imóveis:', err)
    });
  }

  private initializeForm(): void {
    if (!this.locatario) return;

    const aluguelId = this.locatario.aluguel_id;
    const idNum = typeof aluguelId === 'string' ? parseInt(aluguelId, 10) : aluguelId;
    const valorId = (idNum != null && !isNaN(idNum)) ? idNum : null;
    this.selectedImovel = valorId != null
      ? (this.imoveis.find(im => im.id === valorId) ?? null)
      : null;

    this.locatarioForm = this.fb.group({
      nome: [this.locatario.nome, [Validators.required]],
      telefone: [this.locatario.telefone, [Validators.required]],
      email: [this.locatario.email, [Validators.required, Validators.email]],
      aluguel_id: [valorId]
    });
  }

  onSubmit(): void {
    if (this.locatarioForm.valid && this.locatario) {
      const aluguelId = this.locatarioForm.get('aluguel_id')?.value;
      const formValue = {
        id: this.locatario.id,
        nome: this.locatarioForm.get('nome')?.value,
        telefone: this.locatarioForm.get('telefone')?.value,
        email: this.locatarioForm.get('email')?.value,
        aluguel_id: aluguelId ?? null
      };
      console.log('Dados salvos:', formValue);
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
    if (this.locatarioForm.valid && this.locatario) {
      const aluguelId = this.locatarioForm.get('aluguel_id')?.value as number | null;
      const updateData = {
        nome: this.locatarioForm.get('nome')?.value,
        telefone: this.locatarioForm.get('telefone')?.value,
        email: this.locatarioForm.get('email')?.value,
        aluguel_id: aluguelId ?? null
      };

      // Atualizar locatário na API
      this.locatarioService.updateLocatario(this.locatario.id, updateData).subscribe({
        next: (data) => {
          this.locatario = data;
          this.selectedImovel = aluguelId != null ? (this.imoveis.find(im => im.id === aluguelId) ?? null) : null;
          this.editandoLocatario = false;
          this.cdr.detectChanges();
          console.log('Locatário atualizado com sucesso:', this.locatario);
        },
        error: (error) => {
          console.error('Erro ao atualizar locatário:', error);
        }
      });
    }
  }
}
