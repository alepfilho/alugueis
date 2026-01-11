import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string = '';
  private modelo: string = 'models/gemini-3-flash-preview';

  constructor() {
    // A chave da API deve ser configurada via variável de ambiente ou configuração
    // Por enquanto, será necessário configurar manualmente ou via environment
    this.initializeGemini();
  }

  private initializeGemini(): void {
    this.apiKey = 'xxxxxxxxxxx';
    
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
   * Define a chave da API do Gemini
   * @param apiKey Chave da API do Google Gemini
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.initializeGemini();
  }

  /**
   * Define o modelo a ser usado
   * @param modelo Nome do modelo ('gemini-1.5-flash' ou 'gemini-1.5-pro')
   */
  setModelo(modelo: string): void {
    this.modelo = modelo;
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
      // Usar o modelo configurado (padrão: gemini-1.5-flash)
      // Alternativas: 'gemini-1.5-pro' (mais poderoso) ou 'gemini-1.5-flash' (mais rápido)
      const model = this.genAI.getGenerativeModel({ model: this.modelo });

      // Construir o prompt com contexto
      let prompt = mensagem;
      
      if (contexto) {
        prompt = `Contexto do imóvel:\n${contexto}\n\nPergunta do usuário: ${mensagem}\n\nPor favor, responda de forma clara e objetiva sobre o imóvel, baseando-se no contexto fornecido.`;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      
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

