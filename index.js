import express from "express";
import { GoogleAuth } from "google-auth-library";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:4200',      // desenvolvimento Angular
    'https://front-reds.vercel.app/', // seu domínio da Vercel
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());
app.use(express.static("public"));

const TOKENS_FILE = "./db.json";

// cria o arquivo db.json automaticamente se não existir
if (!fs.existsSync(TOKENS_FILE)) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify([]));
  console.log("📁 db.json criado automaticamente!");
}

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

const PROJECT_ID = "typebot-leads-notifications";
const MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

// função pra enviar push
async function sendNotification(token, title, body, image, click) {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: [MESSAGING_SCOPE],
  });
  const accessToken = await auth.getAccessToken();

  const message = {
    message: {
      token,
      notification: { title, body, image },
      webpush: {
        fcmOptions: { link: click },
        notification: {
          icon: "https://typebot-push.onrender.com/imagens/icon.png", // 🔔 usa seu ícone local
          image: image || "https://typebot-push.onrender.com/imagens/icon.png", // opcional
        },
      },
    },
  };

  await axios.post(FCM_ENDPOINT, message, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

// rota pra registrar token vindo do front
app.post("/register", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token é obrigatório" });

  let tokens = [];
  if (fs.existsSync(TOKENS_FILE)) {
    tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));
  }

  if (!tokens.includes(token)) {
    tokens.push(token);
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  }

  return res.json({ success: true, message: "Token salvo com sucesso!" });
});

// webhook do Typebot
app.post("/webhook/typebot", async (req, res) => {
  try {
    const data = req.body;
    const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));

    const nomeCliente = data?.lead?.nome || "Cliente";

    const title = "💰 Nova venda realizada!";
    const body = `Cliente: ${nomeCliente}`;
    const image = "https://typebot-push.onrender.com/imagens/icon.png"; // 🟢 sua imagem
    const click = "https://painel.seusite.com/vendas";

    for (const token of tokens) {
      try {
        await sendNotification(token, title, body, image, click);
        console.log(`✅ Notificação enviada para ${nomeCliente}`);
      } catch (err) {
        console.log("❌ Erro com token:", token, err.message);
      }
    }

    res.send("✅ Notificações enviadas!");
  } catch (error) {
    console.error("Erro no webhook:", error.message);
    res.status(500).send("Erro ao enviar notificações.");
  }
});

// rota de teste
app.get("/test", async (req, res) => {
  const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));
  if (!tokens.length) return res.send("Nenhum token registrado ainda!");
  await sendNotification(tokens[0], "🚀 Teste de notificação", "Está funcionando 🔔", null, "https://google.com");
  res.send("Notificação de teste enviada!");
});

app.listen(process.env.PORT || 4000, () =>
  console.log(`🔥 Servidor rodando em http://localhost:${process.env.PORT || 4000}`)
);
