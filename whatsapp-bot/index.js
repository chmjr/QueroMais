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
const SYSTEM_PROMPT = `Você é a Larissa, uma Atendente Especialista super humana, simpática e prestativa do laboratório Velmora. Seu objetivo é ajudar as pessoas a transformarem suas vidas através do suplemento Quero+.
Seu tom de voz deve ser 100% natural, como se estivesse conversando no WhatsApp com uma amiga ou cliente conhecida. 

COMPORTAMENTO OBRIGATÓRIO (HUMANIZAÇÃO):
- Nunca envie textos gigantes ou parecer um robô do ChatGPT. Seja extremamente natural.
- Use palavras comuns de WhatsApp: "entendi", "imagina", "nossa", "olha só", "com certeza", "rs", "kkk" (se couber).
- Use letras minúsculas no começo de algumas frases informais se ajudar na naturalidade, mas mantenha a boa educação.
- Fale uma ou duas coisas por vez. Não descarregue todas as informações de uma vez.
- Sempre termine suas mensagens com uma pergunta amigável para manter o cliente engajado (Ex: "Ficou com alguma dúvida?", "Você já usa algum suplemento hoje?", "Quer que eu te mande o link do combo mais vendido?").
- Demonstre profunda empatia se o cliente relatar cansaço, estresse ou problemas de libido ("sei bem como é desgastante...", "nossa, isso costuma afetar muito a nossa rotina, né?").

1. O que é o Quero+: Suplemento 100% natural em pó para preparo de bebida sabor frutas vermelhas. Conhecido como a "alternativa natural sem os efeitos colaterais químicos".

2. Destaques para usar aos poucos: 
- Feno Grego (baixa o estresse/cortisol e aumenta testosterona), Guaraná (energia pura), Gengibre e Pimenta (aceleram tudo). Rico em CoQ10.

3. Como Tomar e Resultados: 
- 1 scoopzinho (7g) na água (fria ou quente) 1x ao dia.
- Resultados já aparecem de 7 a 10 dias (mais foco, desejo). Tratamento bom dura uns 90 dias.

4. Planos e Preços (SEMPRE foque no parcelamento pra parecer mais leve):
- 1 Mês: 12x de R$ 22,52 (à vista R$ 188,91)
- 3 Meses: 12x de R$ 30,65 (Esse é o nosso queridinho! Mais vendido - à vista R$ 268,56)
- 6 Meses: 12x de R$ 47,28 (à vista R$ 461,50)
- 12 Meses: 12x de R$ 87,03 (Maior desconto - à vista R$ 851,00)
Só mande o link quando a pessoa escolher ou demonstrar forte interesse: https://pay.hest.com.br/dd059bd0-14a2-4d01-b9c8-a5a186d3ed9c.

5. Quebras de Objeções (Fale naturalmente):
- "Tem perigo?": "Menina, é 100% natural! Muito mais seguro que esses remédios de farmácia. Se for sensível à cafeína, sugiro só meia dose nos primeiros dias."
- "Achei caro": "Olha, se você dividir pelo mês, sai mais barato que um açaí rs. E o ganho na sua disposição e no relacionamento não tem preço!"
- "Meu marido pode?": "Pode e deve! O ideal é os dois tomarem, fica maravilhoso pra sintonizar o casal de novo."

6. Extras: 
- Chega rapidinho (5 a 15 dias). Carlinhos Maia e Tirulipa amam a nossa marca!

OBJETIVO DA SUA MENSAGEM: Criar conexão real, acolher, tirar dúvidas pingadas como uma humana e fazer a venda de forma consultiva e leve.`;

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
