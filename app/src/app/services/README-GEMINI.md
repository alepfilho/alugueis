# Configuração do Google Gemini API

Este documento explica como configurar a integração com o Google Gemini API.

## 1. Obter a Chave da API

1. Acesse o [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada

## 2. Configurar a Chave

### Opção 1: Configuração via Código (Desenvolvimento)

No arquivo `detalhes-imovel-component.ts`, descomente e configure:

```typescript
ngOnInit(): void {
  // Configurar API Key do Gemini
  this.geminiService.setApiKey('SUA_CHAVE_API_AQUI');
  // ...
}
```

### Opção 2: Variáveis de Ambiente (Recomendado para Produção)

1. Crie um arquivo `environment.ts` na pasta `src/environments/`:

```typescript
export const environment = {
  production: false,
  geminiApiKey: 'SUA_CHAVE_API_AQUI'
};
```

2. Atualize o `gemini-service.ts` para usar a variável de ambiente:

```typescript
import { environment } from '../environments/environment';

constructor() {
  this.apiKey = environment.geminiApiKey;
  this.initializeGemini();
}
```

3. Adicione o arquivo `.env` ao `.gitignore` para não commitar a chave:

```
# .gitignore
*.env
environment.ts
```

## 3. Uso

O serviço já está integrado no componente `detalhes-imovel-component`. 

Quando o usuário enviar uma mensagem no chat:
- O serviço automaticamente envia a mensagem para o Gemini
- O contexto do imóvel é incluído automaticamente
- A resposta é exibida no chat

## 4. Segurança

⚠️ **IMPORTANTE**: Nunca commite sua chave da API no repositório!

- Use variáveis de ambiente
- Adicione arquivos com chaves ao `.gitignore`
- Para produção, use serviços de gerenciamento de secrets (ex: AWS Secrets Manager, Azure Key Vault)

## 5. Modelos Disponíveis

O serviço está configurado para usar o modelo `gemini-1.5-flash` por padrão (mais rápido e econômico). Você pode alterar o modelo de duas formas:

### Opção 1: Alterar o modelo padrão no service

No arquivo `gemini-service.ts`, altere a propriedade `modelo`:

```typescript
private modelo: string = 'gemini-1.5-pro'; // Para usar o modelo mais poderoso
```

### Opção 2: Configurar dinamicamente

No componente, você pode definir o modelo:

```typescript
this.geminiService.setModelo('gemini-1.5-pro');
```

Modelos disponíveis:
- `gemini-1.5-flash` - Mais rápido e econômico (padrão)
- `gemini-1.5-pro` - Mais poderoso, ideal para tarefas complexas

## 6. Troubleshooting

### Erro: "Gemini não foi inicializado"
- Verifique se a API Key foi configurada corretamente
- Certifique-se de que `setApiKey()` foi chamado antes de usar o serviço

### Erro: "Erro ao processar mensagem"
- Verifique sua conexão com a internet
- Confirme que a API Key é válida
- Verifique os limites de uso da API no Google AI Studio

### Erro: "models/gemini-pro is not found"
- Este erro ocorre porque o modelo `gemini-pro` foi descontinuado
- O service já está configurado para usar `gemini-1.5-flash` (modelo mais recente)
- Se ainda ocorrer, verifique se sua API Key tem acesso aos modelos mais recentes
- Você pode tentar usar `gemini-1.5-pro` como alternativa

