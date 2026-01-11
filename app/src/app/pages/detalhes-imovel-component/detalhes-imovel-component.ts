import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
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
import { InputTextModule } from 'primeng/inputtext';
import { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';

import { GeminiService } from '../../services/gemini-service';



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

interface IMensagemChat {
  id: number;
  texto: string;
  remetente: 'usuario' | 'assistente';
  hora: Date;
  carregando?: boolean;
}

interface IHistoricoContrato {
  id: number;
  nomeArquivo: string;
  caminhoArquivo: string;
  dataInserção: string;
  tamanhoArquivo?: number;
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
    InputTextModule,
    FormsModule,
    CommonModule,
    CurrencyPipe,
    DatePipe,
    SelectModule,
    DatePickerModule,
    FileUploadModule
  ],
  providers: [MessageService],
  templateUrl: './detalhes-imovel-component.html',
  styleUrl: './detalhes-imovel-component.css',
})
export class DetalhesImovelComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessages') chatMessagesElement!: ElementRef;
  
  imovel!: IDetalhesImovel;
  items: MenuItem[] = [];
  displayDialogPagamento: boolean = false;
  editandoImovel: boolean = false;
  imovelEditado: IDetalhesImovel = {} as IDetalhesImovel;
  dataInicioContratoEditada: Date | null = null;
  displayDialogHistoricoContratos: boolean = false;
  historicoContratos: IHistoricoContrato[] = [];
  novoArquivoContrato: File | null = null;
  
  // Chat
  mensagens: IMensagemChat[] = [];
  novaMensagem: string = '';
  enviandoMensagem: boolean = false;
  private proximoIdMensagem: number = 1;
  
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

  constructor(
    private messageService: MessageService,
    private geminiService: GeminiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Configurar API Key do Gemini (opcional - pode ser feito via variável de ambiente)
    this.geminiService.setApiKey('AIzaSyAxpz6UE6nG9MXt3mB0mda3OcC_xM0Yl9U');
    
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

    // Inicializar histórico de contratos (mockado - substituir por chamada de serviço)
    this.historicoContratos = [
      {
        id: 1,
        nomeArquivo: 'contrato-001.pdf',
        caminhoArquivo: '/assets/contratos/contrato-001.pdf',
        dataInserção: '2026-01-10T00:00:00',
        tamanhoArquivo: 245678
      },
      {
        id: 2,
        nomeArquivo: 'contrato-renovacao-001.pdf',
        caminhoArquivo: '/assets/contratos/contrato-renovacao-001.pdf',
        dataInserção: '2025-12-15T00:00:00',
        tamanhoArquivo: 198432
      },
      {
        id: 3,
        nomeArquivo: 'contrato-inicial.pdf',
        caminhoArquivo: '/assets/contratos/contrato-inicial.pdf',
        dataInserção: '2025-01-10T00:00:00',
        tamanhoArquivo: 312456
      }
    ];
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

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.chatMessagesElement) {
        const element = this.chatMessagesElement.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      // Ignora erros de scroll
    }
  }

  enviarMensagem(): void {
    if (!this.novaMensagem.trim() || this.enviandoMensagem) {
      return;
    }

    const textoMensagem = this.novaMensagem.trim();
    this.novaMensagem = '';

    // Adicionar mensagem do usuário
    const mensagemUsuario: IMensagemChat = {
      id: this.proximoIdMensagem++,
      texto: textoMensagem,
      remetente: 'usuario',
      hora: new Date()
    };
    this.mensagens.push(mensagemUsuario);

    // Adicionar mensagem de carregamento do assistente
    const mensagemCarregando: IMensagemChat = {
      id: this.proximoIdMensagem++,
      texto: '',
      remetente: 'assistente',
      hora: new Date(),
      carregando: true
    };
    this.mensagens.push(mensagemCarregando);

    this.enviandoMensagem = true;

    // Chamar método para integrar com Gemini
    this.processarMensagemComGemini(textoMensagem, mensagemCarregando.id);
  }

  async processarMensagemComGemini(mensagemUsuario: string, idMensagemCarregando: number): Promise<void> {
    try {
      // Verificar se o Gemini está configurado
      if (!this.geminiService.isConfigured()) {
        // Se não estiver configurado, usar resposta simulada
        await new Promise(resolve => setTimeout(resolve, 1000));
        const respostaGemini = this.gerarRespostaSimulada(mensagemUsuario);
        
        const index = this.mensagens.findIndex(m => m.id === idMensagemCarregando);
        if (index !== -1) {
          this.mensagens[index] = {
            id: idMensagemCarregando,
            texto: respostaGemini + '\n\n⚠️ Nota: Configure a API Key do Gemini para respostas mais precisas.',
            remetente: 'assistente',
            hora: new Date(),
            carregando: false
          };
        }
        this.enviandoMensagem = false;
        return;
      }

      // Obter contexto do imóvel
      const contexto = this.obterContextoImovel();
      
      // Enviar mensagem para o Gemini
      const respostaGemini = await this.geminiService.enviarMensagem(mensagemUsuario, contexto);
      
      console.log('Resposta recebida do Gemini:', respostaGemini);
      console.log('Tipo da resposta:', typeof respostaGemini);
      console.log('Tamanho da resposta:', respostaGemini?.length);

      // Atualizar mensagem de carregamento com a resposta
      const index = this.mensagens.findIndex(m => m.id === idMensagemCarregando);
      console.log('Índice da mensagem encontrado:', index);
      
      if (index !== -1) {
        const mensagemAtualizada = {
          id: idMensagemCarregando,
          texto: respostaGemini || 'Resposta vazia recebida',
          remetente: 'assistente' as const,
          hora: new Date(),
          carregando: false
        };
        
        console.log('Atualizando mensagem:', mensagemAtualizada);
        this.mensagens[index] = mensagemAtualizada;
        
        // Forçar detecção de mudanças
        this.mensagens = [...this.mensagens];
        this.cdr.detectChanges();
        
        console.log('Mensagens após atualização:', this.mensagens);
      } else {
        console.error('Mensagem de carregamento não encontrada com ID:', idMensagemCarregando);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem com Gemini:', error);
      
      // Atualizar mensagem de erro
      const index = this.mensagens.findIndex(m => m.id === idMensagemCarregando);
      if (index !== -1) {
        let mensagemErro = 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.';
        
        if (error instanceof Error) {
          if (error.message.includes('API Key')) {
            mensagemErro = '⚠️ API Key do Gemini não configurada. Configure a chave da API para usar o assistente.';
          } else if (error.message.includes('conexão')) {
            mensagemErro = '⚠️ Erro de conexão. Verifique sua internet e tente novamente.';
          }
        }
        
        this.mensagens[index] = {
          id: idMensagemCarregando,
          texto: mensagemErro,
          remetente: 'assistente',
          hora: new Date(),
          carregando: false
        };
      }
    } finally {
      this.enviandoMensagem = false;
    }
  }

  obterContextoImovel(): string {
    // Retorna contexto do imóvel para enviar ao Gemini
    const formatarMoeda = (valor: number): string => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    };
    
    const formatarData = (data: string): string => {
      const date = new Date(data);
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const ano = date.getFullYear();
      return `${dia}/${mes}/${ano}`;
    };
    
    return `
      Imóvel: ${this.imovel.endereco}
      Aluguel: ${formatarMoeda(this.imovel.valorAluguel)}
      Condomínio: ${formatarMoeda(this.imovel.valorCondominio)}
      IPTU: ${formatarMoeda(this.imovel.valorIptu)}
      Inquilino: ${this.imovel.inquilino.nome}
      Data de Início do Contrato: ${formatarData(this.imovel.dataInicioContrato)}
    `;
  }

  // Método temporário para simular respostas (remover quando integrar com Gemini)
  entrarModoEdicaoImovel(): void {
    this.editandoImovel = true;
    // Criar cópia dos dados para edição
    this.imovelEditado = {
      ...this.imovel,
      inquilino: { ...this.imovel.inquilino }
    };
    // Converter string de data para Date object para o datepicker
    if (this.imovel.dataInicioContrato) {
      this.dataInicioContratoEditada = new Date(this.imovel.dataInicioContrato + 'T00:00:00');
    }
  }

  cancelarEdicaoImovel(): void {
    this.editandoImovel = false;
    this.imovelEditado = {} as IDetalhesImovel;
    this.dataInicioContratoEditada = null;
    this.novoArquivoContrato = null;
    // Limpar input file
    const fileInput = document.getElementById('arquivoContrato') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  salvarEdicaoImovel(): void {
    // Converter Date object de volta para string
    if (this.dataInicioContratoEditada) {
      this.imovelEditado.dataInicioContrato = this.formatarData(this.dataInicioContratoEditada);
    }
    
    // Processar upload de novo arquivo de contrato se houver
    if (this.novoArquivoContrato) {
      this.processarUploadContrato();
    }
    
    // Atualizar dados do imóvel
    this.imovel = {
      ...this.imovelEditado,
      inquilino: { ...this.imovelEditado.inquilino }
    };
    this.editandoImovel = false;
    this.dataInicioContratoEditada = null;
    this.novoArquivoContrato = null;
    
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Dados do imóvel atualizados com sucesso!'
    });
  }

  processarUploadContrato(): void {
    if (!this.novoArquivoContrato) return;

    // Aqui você faria o upload real do arquivo para o servidor
    // Por enquanto, vamos simular adicionando ao histórico
    const novoId = this.historicoContratos.length > 0 
      ? Math.max(...this.historicoContratos.map(c => c.id)) + 1 
      : 1;
    
    const novoContrato: IHistoricoContrato = {
      id: novoId,
      nomeArquivo: this.novoArquivoContrato.name,
      caminhoArquivo: `/assets/contratos/${this.novoArquivoContrato.name}`, // Simulado
      dataInserção: new Date().toISOString(),
      tamanhoArquivo: this.novoArquivoContrato.size
    };

    // Adicionar ao início do histórico (mais recente primeiro)
    this.historicoContratos.unshift(novoContrato);
    
    // Atualizar o arquivo atual do imóvel
    this.imovelEditado.arquivoContrato = novoContrato.caminhoArquivo;

    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Contrato enviado com sucesso!'
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de arquivo (apenas PDF)
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Por favor, selecione apenas arquivos PDF'
        });
        return;
      }
      
      // Validar tamanho (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'O arquivo deve ter no máximo 10MB'
        });
        return;
      }

      this.novoArquivoContrato = file;
    }
  }

  abrirHistoricoContratos(): void {
    this.displayDialogHistoricoContratos = true;
  }

  fecharHistoricoContratos(): void {
    this.displayDialogHistoricoContratos = false;
  }

  baixarContratoHistorico(contrato: IHistoricoContrato): void {
    if (contrato.caminhoArquivo) {
      // Se for uma URL completa, abre em nova aba
      if (contrato.caminhoArquivo.startsWith('http://') || contrato.caminhoArquivo.startsWith('https://')) {
        window.open(contrato.caminhoArquivo, '_blank');
      } else {
        // Se for um caminho relativo, tenta fazer download
        const link = document.createElement('a');
        link.href = contrato.caminhoArquivo;
        link.download = contrato.nomeArquivo;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  formatarTamanhoArquivo(bytes: number | undefined): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  private gerarRespostaSimulada(mensagem: string): string {
    const mensagemLower = mensagem.toLowerCase();
    
    const formatarMoeda = (valor: number): string => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
    };
    
    const formatarData = (data: string): string => {
      const date = new Date(data);
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const ano = date.getFullYear();
      return `${dia}/${mes}/${ano}`;
    };
    
    if (mensagemLower.includes('aluguel') || mensagemLower.includes('valor')) {
      return `O valor do aluguel deste imóvel é ${formatarMoeda(this.imovel.valorAluguel)}. Além disso, há o condomínio de ${formatarMoeda(this.imovel.valorCondominio)} e o IPTU de ${formatarMoeda(this.imovel.valorIptu)}.`;
    }
    
    if (mensagemLower.includes('inquilino') || mensagemLower.includes('locatário')) {
      return `O inquilino deste imóvel é ${this.imovel.inquilino.nome}. Você pode entrar em contato pelo telefone ${this.imovel.inquilino.telefone} ou email ${this.imovel.inquilino.email}.`;
    }
    
    if (mensagemLower.includes('pagamento') || mensagemLower.includes('pago')) {
      const pagamentosPendentes = this.imovel.historicoPagamentos.filter(p => p.status !== 'pago').length;
      return `Atualmente há ${pagamentosPendentes} pagamento(s) pendente(s) no histórico. Você pode visualizar todos os detalhes na tabela acima.`;
    }
    
    if (mensagemLower.includes('contrato')) {
      return `O contrato deste imóvel teve início em ${formatarData(this.imovel.dataInicioContrato)}. Você pode baixar o PDF do contrato clicando no botão "Baixar Contrato PDF" acima.`;
    }
    
    return 'Obrigado pela sua mensagem! Em breve, esta funcionalidade estará totalmente integrada com o Gemini AI para fornecer respostas mais precisas e detalhadas.';
  }
}
