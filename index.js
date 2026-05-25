require('dotenv').config();
const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const REGIOES = [
  "Bahia",
  "Belo Horizonte e região",
  "Brasília",
  "Caxias do Sul e região",
  "Goiás",
  "Mato Grosso",
  "Mato Grosso do Sul",
  "Minas Gerais - outras cidades",
  "Paraná",
  "Porto Alegre - RS",
  "Ribeirão Preto - SP",
  "Rio de Janeiro - Capital",
  "Rio de Janeiro - outras cidades",
  "Rio Grande do Sul - outras cidades",
  "São José do Rio Preto - SP",
  "São Paulo - Capital",
  "São Paulo - outras cidades",
  "Tocantins",
  "Outro"
];

async function identificarRegiaoPorIA(resumo) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Analise o resumo de conversa abaixo e identifique em qual região da lista o condomínio do lead se encaixa.

RESUMO DA CONVERSA:
${resumo}

LISTA DE REGIÕES:
${REGIOES.join('\n')}

Responda APENAS com o JSON abaixo, sem markdown, sem texto extra:
{"regiao": "nome exato da região da lista"}

Se não identificar, use "Outro".`
    }]
  });

  const text = message.content.map(b => b.text || '').join('').trim();
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  return parsed.regiao;
}

async function aplicarEtiqueta(phone, tag, apiKey) {
  await axios.post(
    `https://backend.botconversa.com.br/api/v1/subscribers/phone/${phone}/add-tag/`,
    { tag },
    { headers: { 'api-key': apiKey, 'Content-Type': 'application/json' } }
  );
}

// Rota de saúde
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'DSC Webhook - Etiquetador de Região' });
});

// Webhook principal
app.post('/webhook/regiao', async (req, res) => {
  try {
    const { phone, regiao, resumo_conversa } = req.body;
    const apiKey = process.env.BOTCONVERSA_API_KEY;

    console.log(`[webhook] Recebido — phone: ${phone} | regiao: ${regiao || 'vazio'}`);

    if (!phone) {
      return res.status(400).json({ error: 'Campo phone é obrigatório.' });
    }

    let regiaoFinal = null;

    // 1o — usa o campo regiao se preenchido
    if (regiao && regiao.trim() !== '') {
      regiaoFinal = regiao.trim();
      console.log(`[webhook] Região via campo: ${regiaoFinal}`);
    }
    // 2o — usa Claude para identificar pelo resumo
    else if (resumo_conversa && resumo_conversa.trim() !== '') {
      console.log(`[webhook] Região não preenchida. Analisando resumo com IA...`);
      regiaoFinal = await identificarRegiaoPorIA(resumo_conversa);
      console.log(`[webhook] Região identificada por IA: ${regiaoFinal}`);
    }
    else {
      regiaoFinal = 'Outro';
      console.log(`[webhook] Sem dados suficientes. Usando: Outro`);
    }

    // Valida se a região está na lista
    if (!REGIOES.includes(regiaoFinal)) {
      console.log(`[webhook] Região "${regiaoFinal}" não está na lista. Usando: Outro`);
      regiaoFinal = 'Outro';
    }

    // Aplica a etiqueta no BotConversa
    await aplicarEtiqueta(phone, regiaoFinal, apiKey);
    console.log(`[webhook] Etiqueta "${regiaoFinal}" aplicada em ${phone}`);

    return res.json({
      success: true,
      phone,
      regiao: regiaoFinal,
      fonte: regiao && regiao.trim() !== '' ? 'campo' : 'ia'
    });

  } catch (err) {
    console.error(`[webhook] Erro:`, err.message);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
