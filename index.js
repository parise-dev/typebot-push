import express from "express";
import { GoogleAuth } from "google-auth-library";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const TOKENS_FILE = "./db.json";
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

const PROJECT_ID = "typebot-leads-notifications"; // fixo, seu id
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
        notification: { icon: "https://cdn-icons-png.flaticon.com/512/992/992700.png" },
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

// webhook do typebot
app.post("/webhook/typebot", async (req, res) => {
  try {
    const data = req.body;
    const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));

    const title = `💬 Novo lead: ${data?.lead?.nome || "Cliente"}`;
    const body = "Acabou de zerar o fluxo no Typebot!";
    const image = "https://cdn-icons-png.flaticon.com/512/1087/1087927.png";
    const click = "https://painel.seusite.com/leads";

    for (const token of tokens) {
      try {
        await sendNotification(token, title, body, image, click);
      } catch (err) {
        console.log("Erro com token:", token, err.message);
      }
    }

    res.send("✅ Notificações enviadas!");
  } catch (error) {
    console.error(error.message);
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
