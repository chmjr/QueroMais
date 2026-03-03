const axios = require('axios');

// Substitua pelo número real que enviou a mensagem para testar (com DDI e sem o 9 extra, ex: 5511999999999@s.whatsapp.net)
const REMOTE_JID = "5511912345678@s.whatsapp.net";
const WEBHOOK_URL = "https://queromais-production.up.railway.app/webhook";

const fakePayload = {
    event: "messages.upsert",
    instance: "queromais",
    data: {
        message: {
            key: {
                remoteJid: REMOTE_JID,
                fromMe: false,
                id: "3A1BD3..."
            },
            message: {
                conversation: "Oi, como esse produto Quero+ funciona? Ele dá energia mesmo?"
            }
        }
    }
};

console.log(\`🚀 Mandando mensagem de teste simulada para o seu robô no Railway...\`);
console.log(\`🔗 Endpoint: \${WEBHOOK_URL}\`);

axios.post(WEBHOOK_URL, fakePayload, {
    headers: { 'Content-Type': 'application/json' }
}).then(response => {
    console.log("✅ Webhook recebeu o aviso com sucesso! Status:", response.status);
    console.log("👀 Agora, cheque a tela de DEPLOYS/LOGS lá no painel do seu Railway para ver se a Larissa pensou numa resposta!");
}).catch(error => {
    console.error("❌ ERRO ao tentar alcançar o seu robô no Railway:");
    console.error(error.message);
    if(error.response) console.error(error.response.data);
});
