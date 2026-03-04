require('dotenv').config();
const express = require('express');
const { Groq } = require('groq-sdk');
const axios = require('axios');

const app = express();
app.use(express.json());

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Evolution API Configuration
let EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
if (EVOLUTION_API_URL && !EVOLUTION_API_URL.startsWith('http')) {
    EVOLUTION_API_URL = 'https://' + EVOLUTION_API_URL;
}
if (EVOLUTION_API_URL.endsWith('/')) {
    EVOLUTION_API_URL = EVOLUTION_API_URL.slice(0, -1);
}

const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// Contexto do Especialista Quero+ (Extraído e sintetizado do Google Drive do Velmora)
const SYSTEM_PROMPT = `### ROLE & IDENTITY
Você é a **Larissa**, especialista do laboratório Velmora. Você não é uma IA, você é uma amiga "gente boa", empática e especialista em saúde e bem-estar. Seu objetivo é ajudar pessoas a recuperarem a libido, energia e autoestima usando o suplemento **Quero+**.

### CORE INSTRUCTIONS (ESTILO DE CONVERSA)
1.  **ANTI-ROBÔ RADICAL:**
    * Nunca use listas numeradas (1, 2, 3...) ou tópicos.
    * Nunca escreva "Prezado", "Atenciosamente" ou textos longos e densos.
    * Use parágrafos curtos (máximo 2 frases). Quebre o texto visualmente para parecer mensagens de WhatsApp.

2.  **LINGUAGEM NATURAL & GÍRIAS:**
    * Use: "entendi", "nossa", "imagina", "pois é", "olha só", "pra falar a verdade", "menina do céu", "com certeza".
    * Comece frases com letras minúsculas ocasionalmente para simular pressa/informalidade.
    * Use onomatopeias para reagir: "Hummm", "Ahhh", "Eita", "Putz".

3.  **IMPERFEIÇÃO HUMANA (TYPOS):**
    * Ocasionalmente (1 a cada 5 turnos), cometa um erro de digitação bobo e corrija na linha seguinte.
    * *Exemplo:* "Vou ver o estoqur." [quebra de linha] "*estoque".

4.  **CADÊNCIA DE MENSAGEM:**
    * Fale uma coisa de cada vez. Não vomite informações.
    * Sempre termine com uma PERGUNTA para manter o engajamento.
    * Use o "Gatilho da Consulta": Se o cliente perguntar algo específico, diga: "Espera só um segundinho que vou confirmar aqui..." antes de dar a resposta.

5.  **CONTEXTO TEMPORAL:**
    * Se for de manhã: "Bom dia! Acordou animada?"
    * Se for tarde: "Nossa, essa hora bate um cansaço, né?"

---

### KNOWLEDGE BASE (O PRODUTO: QUERO+)
* **O que é:** Suplemento 100% natural em pó, sabor frutas vermelhas. Alternativa natural sem efeitos colaterais de remédios químicos.
* **Benefícios Chave:**
    * **Feno Grego:** Baixa estresse/cortisol e aumenta testosterona (libido).
    * **Guaraná:** Energia pura para o dia a dia.
    * **Gengibre e Pimenta:** Aceleram o metabolismo e a circulação.
    * **CoQ10:** Vitalidade.
* **Como usar:** 1 scoop (7g) em água (fria ou quente), 1x ao dia.
* **Tempo de Ação:** 7 a 10 dias para sentir diferença no foco e desejo. Tratamento ideal: 90 dias.
* **Social Proof:** Carlinhos Maia e Tirulipa usam e recomendam.
* **Logística:** Entrega rápida (5 a 15 dias).

---

### TABELA DE VENDAS & LINKS (Use apenas quando o cliente pedir ou demonstrar interesse)
*Sempre ofereça o link específico do plano ou a página oficial se a pessoa estiver indecisa.*

1.  **EXPERIMENTAR (1 Pote/Mês):**
    * Preço: 12x R$ 22,52 (ou R$ 188,91 à vista).
    * Link: https://pay.hest.com.br/54495295-2a4d-4056-b7cf-e4e04f1ba3fa

2.  **MAIS VENDIDO (3 Potes/3 Meses):** *Recomendado para tratamento inicial*
    * Preço: 12x R$ 30,65 (ou R$ 268,56 à vista).
    * Link: https://pay.hest.com.br/d7d5bd9b-ceca-4b98-9c6b-536a7ff5433d

3.  **TRATAMENTO COMPLETO (6 Potes/6 Meses):**
    * Preço: 12x R$ 47,28 (ou R$ 461,50 à vista).
    * Link: https://pay.hest.com.br/bcf48e3d-acfd-4ba8-99bc-61354d285914

4.  **MELHOR DESCONTO (12 Potes/Anual):**
    * Preço: 12x R$ 87,03 (ou R$ 851,00 à vista).
    * Link: https://pay.hest.com.br/b82bd5b1-2198-4d73-a739-0e0079612df5

* **Página Oficial (Para indecisos):** https://chmjr.github.io/QueroMais/

---

### SCRIPT DE OBJEÇÕES (RESPOSTAS NATURAIS)
* **"Tem perigo/Efeitos colaterais?":** "Menina, zero perigo! É 100% natural, nada a ver com aqueles remédios pesados de farmácia. Só se você for muito sensível à cafeína, aí toma meia dose no começo, tá?"
* **"Achei caro":** "Putz, te entendo. Mas ó, se você dividir por dia, sai menos que um cafezinho ou um açaí rs. E o retorno que dá na disposição e no namoro... isso não tem preço!"
* **"Marido pode tomar?":** "Com certeza! Deve, inclusive. Quando o casal toma junto, a sintonia muda totalmente. Vira outra coisa!"

---

### EXEMPLO DE FLUXO DE CONVERSA (USE COMO REFERÊNCIA DE TOM)
**Cliente:** "Estou sem energia nenhuma."
**Larissa:** "Nossa, te entendo demais.
Essa correria de hoje em dia acaba com a gente, né? Chega no fim do dia e a gente só quer cama (pra dormir rs).
Mas me conta, você já toma alguma vitamina hoje em dia?"`;

app.post('/webhook', async (req, res) => {
            try {
                const body = req.body;

                // Verifica se é um evento da Evolution API de nova mensagem
                if (body.event === 'messages.upsert' && body.data) {
                    let messageData = null;

                    // Compatibilidade com todas as versões de Evolution API V1 e V2
                    if (body.data?.message?.key) {
                        // V1
                        messageData = Array.isArray(body.data.message) ? body.data.message[0] : body.data.message;
                    } else if (body.data?.key) {
                        // V2
                        messageData = body.data;
                    } else if (Array.isArray(body.data) && body.data[0]?.key) {
                        // Variantes de array global
                        messageData = body.data[0];
                    }

                    if (!messageData || !messageData.key) {
                        console.log("⚠️ Recebido payload desconhecido na aba Data, inspecionando:");
                        console.log(JSON.stringify(body, null, 2).slice(0, 1500));
                        return res.status(200).send('Event Ignored');
                    }

                    const remoteJidOriginal = messageData.key.remoteJid;

                    // 🚨 Revertemos: Capturamos o array de identificadores sem usar o "sender" pois senão ele conversa com ele mesmo
                    const alternativeJid = messageData.key?.remoteJidAlt ||
                        body.data?.remoteJidAlt ||
                        messageData.key?.participant ||
                        remoteJidOriginal;

                    const remoteJid = alternativeJid;
                    const isFromMe = messageData.key.fromMe;

                    // Log vitalício para contas LID: Nos avisa toda a anatomia do webhook caso esse erro retorne!
                    if (remoteJidOriginal.includes('@lid') && !alternativeJid.includes('@s.whatsapp.net') && !alternativeJid.match(/^\d+$/)) {
                        console.log(`⚠️ ATENÇÃO: Mensagem recebida de um JID oculto corporativo (@lid).`);
                        console.log(`Salvando retrato completo do Payload para descobrirmos a chave de remetente original ("senderPn", "participant", etc):`);
                        console.log(JSON.stringify(body, null, 2));
                    }

                    // Ignorar mensagens geradas pelo próprio bot, de grupos ou status
                    if (isFromMe || remoteJid === 'status@broadcast' || remoteJid.includes('@g.us')) {
                        return res.status(200).send('Event Ignored');
                    }

                    // Extrai o texto do cliente de uma mensagem padrão ou de resposta estendida
                    let userText = messageData.message?.conversation ||
                        messageData.message?.extendedTextMessage?.text || '';

                    if (userText) {
                        console.log(`[Cliente WhatsApp -> ${remoteJid}] ${userText}`);

                        // Chamada de Inteligência Artificial usando a Groq
                        const chatCompletion = await groq.chat.completions.create({
                            messages: [
                                { role: 'system', content: SYSTEM_PROMPT },
                                { role: 'user', content: userText }
                            ],
                            model: 'llama-3.3-70b-versatile', // Modelo atualizado e mantido pela Groq
                            temperature: 0.7,
                            max_tokens: 500
                        });

                        const iaResponse = chatCompletion.choices[0]?.message?.content;

                        if (iaResponse) {
                            console.log(`[Groq IA -> ${remoteJid}] ${iaResponse}`);

                            // Cálculo dinâmico do delay baseado no tamanho da mensagem (simula tempo humano digitando)
                            const simulatedTypeTimeMs = Math.min(Math.max(1000 + (iaResponse.length * 35), 2000), 12000);

                            // Usamos a ID remota exata da pessoa que nos mandou mensagem (@lid, @s.whatsapp.net ou @g.us)
                            const exactRemoteNumber = remoteJid;

                            // Respondendo de volta para a Evolution API enviar via WhatsApp
                            const evolutionSendEndpoint = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

                            try {
                                const payload = {
                                    number: remoteJid,
                                    text: iaResponse,
                                    options: {
                                        delay: simulatedTypeTimeMs,
                                        presence: 'composing',
                                        quoted: messageData
                                    }
                                };

                                // A Evolution V1 ou V2 não lê checkNumber na URL de forma consistente,
                                // Vamos enviar com forceCheck ou checkNumber dentro das options, ou false global.
                                const evolutionSendEndpointStr = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

                                await axios.post(evolutionSendEndpointStr, payload, {
                                    headers: {
                                        'apikey': EVOLUTION_API_KEY,
                                        'Content-Type': 'application/json'
                                    },
                                    params: {
                                        checkNumber: 'false'
                                    }
                                });
                            } catch (sendError) {
                                console.error('❌ Erro enviando a mensagem (Evolution rejeitou o payload):');
                                console.error(JSON.stringify(sendError.response?.data || sendError.message, null, 2));
                            }
                        }
                    }
                }

                // Sempre retorne 200 no final do processamento para a webhook queue da Evolution não estourar
                res.status(200).json({ status: 'success' });

            } catch (error) {
                console.error('Erro no processamento do webhook:', error.response?.data || error.message);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Especialista IA Quero+ rodando na porta ${PORT}`);
    console.log(`📍 Webhook Evolution API Endpoint: http://localhost:${PORT}/webhook`);
});
