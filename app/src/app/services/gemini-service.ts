import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string = '';
  private modelo: string = 'models/gemini-3-flash-preview';

  /** Modelos em ordem de preferência; se um retornar 503 (overloaded), tenta o próximo */
  private static readonly MODELOS_FALLBACK: string[] = [
    'models/gemini-3-flash-preview',
    'models/gemini-2.0-flash',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
  ];

  constructor() {
    // A chave da API deve ser configurada via variável de ambiente ou configuração
    // Por enquanto, será necessário configurar manualmente ou via environment
    this.initializeGemini();
  }

  initializeGemini(): void {
    this.apiKey = 'AIzaSyCqYAdpm8mHVgImydfcBFtbdRtW1H54FbM';
    
    if (!this.apiKey) {
      console.warn('Gemini API Key não configurada. Configure a chave antes de usar o serviço.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    } catch (error) {
      console.error('Erro ao inicializar Gemini:', error);
    }
  }

  /**
   * Define o modelo a ser usado
   * @param modelo Nome do modelo ('gemini-1.5-flash' ou 'gemini-1.5-pro')
   */
  setModelo(modelo: string): void {
    this.modelo = modelo;
  }

  /** Limite para envio inline (base64) em MB - evita ERR_HTTP2_PROTOCOL_ERROR do upload resumável */
  private static readonly MAX_INLINE_FILE_MB = 20;

  /** Verifica se o erro indica modelo indisponível (503 / overloaded / UNAVAILABLE) */
  private isModelUnavailableError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      msg.includes('overloaded') ||
      msg.includes('503') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('try again later')
    );
  }

  /**
   * Converte Blob/ArrayBuffer para base64 (para envio inline ao Gemini, evitando upload resumável).
   */
  private async fileToBase64(fileData: Blob | ArrayBuffer): Promise<string> {
    let arrayBuffer: ArrayBuffer;
    if (fileData instanceof Blob) {
      arrayBuffer = await fileData.arrayBuffer();
    } else {
      arrayBuffer = fileData;
    }
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Envia uma mensagem para o Gemini com um arquivo PDF como contexto.
   * Usa dados inline (base64) em vez de upload resumável para evitar ERR_HTTP2_PROTOCOL_ERROR.
   * @param mensagem Mensagem do usuário
   * @param fileData Dados do arquivo PDF (Blob ou ArrayBuffer)
   * @returns Promise com a resposta do Gemini
   */
  async enviarMensagemComArquivo(mensagem: string, fileData: Blob | ArrayBuffer): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini não foi inicializado. Configure a API Key primeiro.');
    }

    try {
      const mimeType = 'application/pdf';
      const sizeBytes = fileData instanceof Blob ? fileData.size : (fileData as ArrayBuffer).byteLength;
      const sizeMB = sizeBytes / (1024 * 1024);

      if (sizeMB > GeminiService.MAX_INLINE_FILE_MB) {
        throw new Error(
          `Arquivo muito grande (${sizeMB.toFixed(1)} MB). O limite para análise é ${GeminiService.MAX_INLINE_FILE_MB} MB.`
        );
      }

      const base64Data = await this.fileToBase64(fileData);
      const prompt = `Com base no contrato em PDF fornecido, responda à seguinte pergunta: ${mensagem}\n\nPor favor, analise o documento e forneça uma resposta clara e objetiva.`;
      const content = [prompt, { inlineData: { mimeType, data: base64Data } }];

      const modelos = [this.modelo, ...GeminiService.MODELOS_FALLBACK.filter((m) => m !== this.modelo)];
      let lastError: unknown;
      for (const modeloId of modelos) {
        try {
          const model = this.genAI.getGenerativeModel({ model: modeloId });
          const result = await model.generateContent(content);
          const response = await result.response;
          return response.text();
        } catch (err) {
          lastError = err;
          if (this.isModelUnavailableError(err)) {
            console.warn(`Modelo ${modeloId} indisponível (503/overloaded), tentando próximo...`, err);
            continue;
          }
          throw err;
        }
      }
      console.error('Erro ao enviar mensagem com arquivo para Gemini:', lastError);
      throw new Error('Erro ao processar mensagem com arquivo. Verifique sua conexão e a configuração da API.');
    } catch (error) {
      console.error('Erro ao enviar mensagem com arquivo para Gemini:', error);
      throw new Error('Erro ao processar mensagem com arquivo. Verifique sua conexão e a configuração da API.');
    }
  }

  /**
   * Envia uma mensagem para o Gemini e retorna a resposta
   * @param mensagem Mensagem do usuário
   * @param contexto Contexto adicional (ex: informações do imóvel)
   * @returns Promise com a resposta do Gemini
   */
  async enviarMensagem(mensagem: string, contexto?: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini não foi inicializado. Configure a API Key primeiro.');
    }

    try {
      let prompt = mensagem;
      if (contexto) {
        prompt = `Contexto do imóvel:\n${contexto}\n\nPergunta do usuário: ${mensagem}\n\nPor favor, responda de forma clara e objetiva sobre o imóvel, baseando-se no contexto fornecido.`;
      }

      const modelos = [this.modelo, ...GeminiService.MODELOS_FALLBACK.filter((m) => m !== this.modelo)];
      let resultResponse: Awaited<ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['generateContent']>>['response'] | undefined;
      let lastError: unknown;
      for (const modeloId of modelos) {
        try {
          const model = this.genAI.getGenerativeModel({ model: modeloId });
          const result = await model.generateContent(prompt);
          resultResponse = result.response;
          break;
        } catch (err) {
          lastError = err;
          if (this.isModelUnavailableError(err) || (err instanceof Error && err.message.includes('not found'))) {
            console.warn(`Modelo ${modeloId} indisponível ou não encontrado, tentando próximo...`, err);
            continue;
          }
          throw err;
        }
      }
      if (typeof resultResponse === 'undefined') {
        throw lastError ?? new Error('Nenhum modelo disponível.');
      }
      const response = resultResponse;
      const result = { response };
      
      console.log('Response object:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response));
      
      // Tentar obter o texto da resposta
      let texto: string = '';
      
      try {
        texto = response.text();
        console.log('Texto extraído via response.text():', texto);
        console.log('Tamanho do texto:', texto?.length);
      } catch (error) {
        console.error('Erro ao extrair texto da resposta:', error);
        console.log('Resposta completa (JSON):', JSON.stringify(response, null, 2));
        
        // Tentar acessar diretamente os candidatos se o método text() falhar
        try {
          const responseAny = response as any;
          console.log('Tentando acessar candidatos diretamente...');
          console.log('response.candidates:', responseAny.candidates);
          
          if (responseAny.candidates && responseAny.candidates.length > 0) {
            const candidate = responseAny.candidates[0];
            console.log('Candidate:', candidate);
            console.log('Candidate.content:', candidate.content);
            
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
              const part = candidate.content.parts[0];
              console.log('Part:', part);
              texto = part.text || '';
              console.log('Texto extraído do part:', texto);
            }
          }
        } catch (error2) {
          console.error('Erro ao acessar candidatos:', error2);
        }
      }

      if (!texto || texto.trim() === '') {
        console.warn('Resposta vazia do Gemini');
        console.log('Tentando método alternativo...');
        
        // Última tentativa: acessar diretamente
        try {
          const responseAny = response as any;
          if (responseAny.candidates?.[0]?.content?.parts?.[0]?.text) {
            texto = responseAny.candidates[0].content.parts[0].text;
            console.log('Texto encontrado via acesso direto:', texto);
          }
        } catch (e) {
          console.error('Falha no método alternativo:', e);
        }
        
        if (!texto || texto.trim() === '') {
          return 'Desculpe, não consegui gerar uma resposta válida.';
        }
      }

      console.log('Texto final retornado:', texto);
      return texto;
    } catch (error) {
      console.error('Erro ao enviar mensagem para Gemini:', error);
      
      // Tentar com modelo alternativo se o primeiro falhar
      if (error instanceof Error && error.message.includes('not found')) {
        try {
          console.log('Tentando com modelo alternativo: gemini-1.5-pro');
          const modelAlt = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-pro' });
          let prompt = mensagem;
          
          if (contexto) {
            prompt = `Contexto do imóvel:\n${contexto}\n\nPergunta do usuário: ${mensagem}\n\nPor favor, responda de forma clara e objetiva sobre o imóvel, baseando-se no contexto fornecido.`;
          }
          
          const result = await modelAlt.generateContent(prompt);
          const response = await result.response;
          const texto = response.text();
          
          return texto || 'Desculpe, não consegui gerar uma resposta.';
        } catch (error2) {
          console.error('Erro ao tentar modelo alternativo:', error2);
        }
      }
      
      throw new Error('Erro ao processar mensagem com Gemini. Verifique sua conexão e a configuração da API.');
    }
  }

  /**
   * Verifica se o serviço está configurado e pronto para uso
   */
  isConfigured(): boolean {
    return this.genAI !== null && this.apiKey !== '';
  }
}

