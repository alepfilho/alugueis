import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { SpeedDialModule } from 'primeng/speeddial';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';


interface IInquilino {
  nome: string;
  telefone: string;
  email: string;
}

interface IPagamento {
  id: number;
  tipo: 'aluguel' | 'iptu' | 'condominio';
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  status: 'pendente' | 'atrasado' | 'pago';
  mesReferencia: string;
}

interface IDetalhesImovel {
  id: number;
  endereco: string;
  valorCondominio: number;
  valorAluguel: number;
  valorIptu: number;
  valorCaucao: number;
  dataInicioContrato: string;
  arquivoContrato: string;
  inquilino: IInquilino;
  historicoPagamentos: IPagamento[];
}

@Component({
  selector: 'app-detalhes-imovel-component',
  imports: [
    CardModule,
    TableModule,
    TagModule,
    DividerModule,
    PaginatorModule,
    ButtonModule,
    SpeedDialModule,
    ToastModule,
    DialogModule,
    InputNumberModule,
    FormsModule,
    CommonModule,
    CurrencyPipe,
    DatePipe,
    Select,
    DatePicker
  ],
  providers: [MessageService],
  templateUrl: './detalhes-imovel-component.html',
  styleUrl: './detalhes-imovel-component.css',
})
export class DetalhesImovelComponent implements OnInit {
  imovel!: IDetalhesImovel;
  items: MenuItem[] = [];
  displayDialogPagamento: boolean = false;
  
  // Formulário de pagamento
  novoPagamento: {
    tipo: 'aluguel' | 'iptu' | 'condominio' | null;
    dataVencimento: string | null;
    valor: number | null;
    status: 'pendente' | 'atrasado' | 'pago' | null;
  } = {
    tipo: null,
    dataVencimento: null,
    valor: null,
    status: null
  };

  // Opções para dropdowns
  tiposPagamento = [
    { label: 'Aluguel', value: 'aluguel' },
    { label: 'IPTU', value: 'iptu' },
    { label: 'Condomínio', value: 'condominio' }
  ];

  statusPagamento = [
    { label: 'Pendente', value: 'pendente' },
    { label: 'Atrasado', value: 'atrasado' },
    { label: 'Pago', value: 'pago' }
  ];

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.items = [
      {
        label: 'Adicionar Pagamento',
        icon: 'pi pi-plus',
        command: () => {
          this.adicionarPagamento();
        }
      },
      {
        label: 'Adicionar Inadimplência',
        icon: 'pi pi-exclamation-triangle',
        command: () => {
          this.adicionarInadimplencia();
        }
      }
    ];
    // Dados mockados - substituir por chamada de serviço
    this.imovel = {
      id: 1,
      endereco: 'Rua Galvão Bueno, 485 - Ap 91',
      valorCondominio: 350.00,
      valorAluguel: 1700.80,
      valorIptu: 180.50,
      valorCaucao: 3401.60,
      dataInicioContrato: '2026-01-10',
      arquivoContrato: '/assets/contratos/contrato-001.pdf',
      inquilino: {
        nome: 'Alexandre P Filho',
        telefone: '(11) 98765-4321',
        email: 'alexandre@email.com'
      },
      historicoPagamentos: [
        {
          id: 1,
          tipo: 'aluguel',
          valor: 1700.80,
          dataVencimento: '2026-01-05',
          dataPagamento: '2026-01-03',
          status: 'pago',
          mesReferencia: 'Janeiro/2026'
        },
        {
          id: 2,
          tipo: 'iptu',
          valor: 180.50,
          dataVencimento: '2026-01-10',
          dataPagamento: null,
          status: 'atrasado',
          mesReferencia: 'Janeiro/2026'
        },
        {
          id: 3,
          tipo: 'condominio',
          valor: 350.00,
          dataVencimento: '2026-01-05',
          dataPagamento: '2026-01-02',
          status: 'pago',
          mesReferencia: 'Janeiro/2026'
        },
        {
          id: 4,
          tipo: 'aluguel',
          valor: 1700.80,
          dataVencimento: '2026-02-05',
          dataPagamento: '2026-02-01',
          status: 'pago',
          mesReferencia: 'Fevereiro/2026'
        },
        {
          id: 5,
          tipo: 'iptu',
          valor: 180.50,
          dataVencimento: '2026-02-10',
          dataPagamento: '2026-02-08',
          status: 'pago',
          mesReferencia: 'Fevereiro/2026'
        },
        {
          id: 6,
          tipo: 'condominio',
          valor: 350.00,
          dataVencimento: '2026-02-05',
          dataPagamento: '2026-02-03',
          status: 'pago',
          mesReferencia: 'Fevereiro/2026'
        }
      ]
    };
  }

  getTipoPagamentoLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'aluguel': 'Aluguel',
      'iptu': 'IPTU',
      'condominio': 'Condomínio'
    };
    return labels[tipo] || tipo;
  }

  downloadContrato(): void {
    if (this.imovel?.arquivoContrato) {
      // Se for uma URL completa, abre em nova aba
      if (this.imovel.arquivoContrato.startsWith('http://') || this.imovel.arquivoContrato.startsWith('https://')) {
        window.open(this.imovel.arquivoContrato, '_blank');
      } else {
        // Se for um caminho relativo, tenta fazer download
        const link = document.createElement('a');
        link.href = this.imovel.arquivoContrato;
        link.download = `contrato-${this.imovel.id}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  adicionarPagamento(): void {
    this.novoPagamento = {
      tipo: null,
      dataVencimento: null,
      valor: null,
      status: null
    };
    this.displayDialogPagamento = true;
  }

  salvarPagamento(): void {
    if (!this.novoPagamento.tipo || !this.novoPagamento.dataVencimento || 
        !this.novoPagamento.valor || !this.novoPagamento.status) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenção',
        detail: 'Por favor, preencha todos os campos'
      });
      return;
    }

    // Formatar data (vem como string do input type="date")
    const dataVencimento = new Date(this.novoPagamento.dataVencimento + 'T00:00:00');
    const mesReferencia = this.formatarMesReferencia(dataVencimento);
    
    // Criar novo pagamento
    const novoId = Math.max(...this.imovel.historicoPagamentos.map(p => p.id)) + 1;
    const novoPagamento: IPagamento = {
      id: novoId,
      tipo: this.novoPagamento.tipo,
      valor: this.novoPagamento.valor,
      dataVencimento: this.novoPagamento.dataVencimento,
      dataPagamento: this.novoPagamento.status === 'pago' ? this.formatarData(new Date()) : null,
      status: this.novoPagamento.status,
      mesReferencia: mesReferencia
    };

    // Adicionar à lista
    this.imovel.historicoPagamentos.push(novoPagamento);
    
    // Fechar dialog e mostrar mensagem
    this.displayDialogPagamento = false;
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Pagamento adicionado com sucesso!'
    });

    // Limpar formulário
    this.novoPagamento = {
      tipo: null,
      dataVencimento: null,
      valor: null,
      status: null
    };
  }

  cancelarPagamento(): void {
    this.displayDialogPagamento = false;
    this.novoPagamento = {
      tipo: null,
      dataVencimento: null,
      valor: null,
      status: null
    };
  }

  formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  formatarMesReferencia(data: Date): string {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[data.getMonth()]}/${data.getFullYear()}`;
  }

  adicionarInadimplencia(): void {
    // TODO: Implementar lógica para adicionar inadimplência
    this.messageService.add({
      severity: 'warn',
      summary: 'Adicionar Inadimplência',
      detail: 'Funcionalidade de adicionar inadimplência será implementada'
    });
  }
}
