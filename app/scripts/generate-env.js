const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const outPath = path.join(__dirname, '..', 'src', 'app', 'env.generated.ts');

let geminiApiKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/GEMINI_API_KEY\s*=\s*(.+)/m);
  if (match) {
    geminiApiKey = match[1].trim().replace(/^["']|["']$/g, '');
  }
}

const outDir = path.dirname(outPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const ts = `// Gerado automaticamente por scripts/generate-env.js - não edite
export const GEMINI_API_KEY = ${JSON.stringify(geminiApiKey)};
`;

fs.writeFileSync(outPath, ts, 'utf8');
console.log('env.generated.ts atualizado a partir de .env');
