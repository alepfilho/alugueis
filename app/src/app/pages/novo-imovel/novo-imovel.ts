import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { ImovelService } from '../../services/imovel-service';

@Component({
  selector: 'app-novo-imovel',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    InputTextModule,
    InputNumberModule,
    ButtonModule,
    DatePickerModule,
    FileUploadModule
  ],
  templateUrl: './novo-imovel.html',
  styleUrl: './novo-imovel.css',
})
export class NovoImovel implements OnInit {
  imovelForm!: FormGroup;
  dataInicioContrato: Date | null = null;
  arquivoContrato: File | null = null;

  constructor(
    private fb: FormBuilder,
    private imovelService: ImovelService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.imovelForm = this.fb.group({
      endereco: ['', [Validators.required]],
      valorAluguel: [null, [Validators.required]],
      valorCondominio: [null, [Validators.required]],
      valorIptu: [null, [Validators.required]],
      valorCaucao: [null, [Validators.required]],
      dataInicioContrato: [null, [Validators.required]],
      arquivoContrato: ['']
    });

    // Sincronizar dataInicioContrato com o FormGroup
    this.imovelForm.get('dataInicioContrato')?.valueChanges.subscribe(value => {
      this.dataInicioContrato = value;
    });
  }

  onDateSelect(date: Date): void {
    this.dataInicioContrato = date;
    this.imovelForm.patchValue({ dataInicioContrato: date });
    this.imovelForm.get('dataInicioContrato')?.markAsTouched();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de arquivo (apenas PDF)
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Por favor, selecione apenas arquivos PDF');
        return;
      }
      
      // Validar tamanho (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('O arquivo deve ter no máximo 10MB');
        return;
      }

      this.arquivoContrato = file;
      this.imovelForm.patchValue({ arquivoContrato: file.name });
    }
  }

  formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T00:00:00Z`;
  }

  isFieldInvalid(fieldName: string): boolean {
    if (fieldName === 'dataInicioContrato') {
      return !this.dataInicioContrato && (this.imovelForm.get('dataInicioContrato')?.touched || false);
    }
    const field = this.imovelForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.imovelForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} é obrigatório`;
      }
      if (field.errors?.['min']) {
        return `${this.getFieldLabel(fieldName)} deve ser maior que ${field.errors['min'].min}`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'endereco': 'Endereço',
      'valorAluguel': 'Valor do Aluguel',
      'valorCondominio': 'Valor do Condomínio',
      'valorIptu': 'Valor do IPTU',
      'valorCaucao': 'Valor do Caução',
      'dataInicioContrato': 'Data de Início do Contrato'
    };
    return labels[fieldName] || fieldName;
  }

  onSubmit(): void {
    // Sincronizar dataInicioContrato com o FormGroup antes de validar
    if (this.dataInicioContrato) {
      this.imovelForm.patchValue({ dataInicioContrato: this.dataInicioContrato });
    }

    // Marcar todos os campos como touched para mostrar erros
    Object.keys(this.imovelForm.controls).forEach(key => {
      this.imovelForm.get(key)?.markAsTouched();
    });

    // Validar data separadamente
    if (!this.dataInicioContrato) {
      this.imovelForm.get('dataInicioContrato')?.markAsTouched();
      this.imovelForm.get('dataInicioContrato')?.setErrors({ required: true });
      console.error('Data de início do contrato não foi preenchida');
      return;
    }

    // Verificar se o formulário é válido
    if (!this.imovelForm.valid) {
      console.error('Formulário inválido. Campos com erro:');
      Object.keys(this.imovelForm.controls).forEach(key => {
        const control = this.imovelForm.get(key);
        if (control && control.invalid) {
          console.error(`- ${key}:`, control.errors);
        }
      });
      
      // Criar mensagem de erro detalhada
      const camposComErro: string[] = [];
      if (this.imovelForm.get('endereco')?.invalid) camposComErro.push('Endereço');
      if (this.imovelForm.get('valorAluguel')?.invalid) camposComErro.push('Valor do Aluguel');
      if (this.imovelForm.get('valorCondominio')?.invalid) camposComErro.push('Valor do Condomínio');
      if (this.imovelForm.get('valorIptu')?.invalid) camposComErro.push('Valor do IPTU');
      if (this.imovelForm.get('valorCaucao')?.invalid) camposComErro.push('Valor do Caução');
      if (!this.dataInicioContrato || this.imovelForm.get('dataInicioContrato')?.invalid) camposComErro.push('Data de Início do Contrato');
      
      if (camposComErro.length > 0) {
        alert(`Por favor, preencha corretamente os seguintes campos:\n${camposComErro.join('\n')}`);
      }
      return;
    }

    const formValue = this.imovelForm.value;
    
    // Converter data para formato ISO
    const dataInicioContratoISO = this.formatarData(this.dataInicioContrato);

    const novoImovel = {
      endereco: formValue.endereco,
      valorAluguel: formValue.valorAluguel,
      valorCondominio: formValue.valorCondominio,
      valorIptu: formValue.valorIptu,
      valorCaucao: formValue.valorCaucao,
      dataInicioContrato: dataInicioContratoISO,
      arquivoContrato: formValue.arquivoContrato || ''
    };

    console.log('Dados que serão enviados:', novoImovel);

    // Criar imóvel na API
    this.imovelService.createImovel(novoImovel).subscribe({
      next: (data) => {
        console.log('Imóvel criado com sucesso:', data);
        // Redirecionar para a lista de aluguéis ou para os detalhes do novo imóvel
        this.router.navigate(['/home/alugueis']);
      },
      error: (error) => {
        console.error('Erro ao criar imóvel:', error);
        console.error('Detalhes do erro:', error.error);
        alert(`Erro ao criar imóvel: ${error.error?.message || error.message || 'Erro desconhecido'}`);
      }
    });
  }
}
