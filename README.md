# DSC Webhook — Etiquetador de Região

Webhook que recebe dados do BotConversa, identifica a região do condomínio e aplica a etiqueta automaticamente no contato.

## Lógica

1. Se o campo `regiao` vier preenchido → usa diretamente
2. Se estiver vazio → analisa o `resumo_conversa` com Claude e identifica a região
3. Aplica a etiqueta correspondente via API do BotConversa

## Deploy no Railway

1. Suba este repositório no GitHub
2. No Railway: New Project → Deploy from GitHub
3. Configure as variáveis de ambiente:
   - `ANTHROPIC_API_KEY` → sua chave da Anthropic
   - `BOTCONVERSA_API_KEY` → sua chave do BotConversa (gere uma nova)
4. Railway detecta o `package.json` e sobe automaticamente

## Configuração no BotConversa

No fluxo SUCESSO, adicione um nó de Webhook com:

- **URL:** `https://seu-projeto.railway.app/webhook/regiao`
- **Método:** POST
- **Body (JSON):**
```json
{
  "phone": "{{telefone}}",
  "regiao": "{{regiao}}",
  "resumo_conversa": "{{RESUMO_CONVERSA}}"
}
```

## Teste local

```bash
cp .env.example .env
# Preencha as chaves no .env

npm install
npm start

# Teste com curl:
curl -X POST http://localhost:3000/webhook/regiao \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5548999999999",
    "regiao": "Paraná",
    "resumo_conversa": ""
  }'
```

## Regiões disponíveis

- Bahia
- Belo Horizonte e região
- Brasília
- Caxias do Sul e região
- Goiás
- Mato Grosso
- Mato Grosso do Sul
- Minas Gerais - outras cidades
- Paraná
- Porto Alegre - RS
- Ribeirão Preto - SP
- Rio de Janeiro - Capital
- Rio de Janeiro - outras cidades
- Rio Grande do Sul - outras cidades
- São José do Rio Preto - SP
- São Paulo - Capital
- São Paulo - outras cidades
- Tocantins
- Outro
