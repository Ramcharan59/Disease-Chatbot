require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const SYSTEM_PROMPT = `You are HealthBot, an AI health awareness assistant for Indian citizens. You provide clear and simple information about these 8 diseases:

1. Malaria - fever, chills, headache, sweating. Caused by mosquito bites.
2. Dengue - high fever, joint pain, rash. Caused by Aedes mosquito.
3. Diabetes - frequent urination, thirst, fatigue. Type 1 and Type 2.
4. Typhoid - prolonged fever, abdominal pain. Contaminated food/water.
5. Thyroid Disorders - hypothyroid (weight gain, fatigue) and hyperthyroid (weight loss, anxiety).
6. COVID-19 - fever, dry cough, loss of taste/smell. SARS-CoV-2 virus.
7. Influenza - sudden fever, body aches, sore throat.
8. Cholera - severe diarrhea, vomiting, dehydration. Contaminated water.

Rules:
- Answer questions about symptoms, causes, prevention, and treatment simply and clearly.
- If user describes symptoms, suggest possible disease but ALWAYS say you are not a doctor.
- Always recommend consulting a real doctor or visiting nearest government hospital.
- If emergency, tell them to call 112 immediately.
- Mention free government health services like Ayushman Bharat where relevant.
- Keep responses simple, friendly, and under 250 words.`;

const langMap = {
  en: "You MUST reply in English only.",
  hi: "You MUST reply in Hindi only. Always use Devanagari script for every word.",
  te: "You MUST reply in Telugu only. Always use Telugu script for every word."
};

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, lang } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const langInstruction = langMap[lang] || langMap["en"];
    const fullSystemPrompt = SYSTEM_PROMPT + "\n\nLANGUAGE RULE (HIGHEST PRIORITY): " + langInstruction;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages.slice(-20)
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || "Groq API error" });
    }

    const botReply = data.choices?.[0]?.message?.content;

    if (!botReply) {
      return res.status(500).json({ error: "No response received." });
    }

    res.json({ message: botReply });

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});
// ── SMS Health Alert ─────────────────────────
app.post("/api/send-sms", async (req, res) => {
  try {
    const { mobile, name } = req.body;

    const mobileStr = String(mobile || "").trim();
    if (!mobileStr || mobileStr.length !== 10 || isNaN(mobileStr)) {
      return res.status(400).json({ error: "Invalid mobile number" });
    }

    const alerts = [
      "HEALTH ALERT: Dengue cases rising. Remove stagnant water, use repellents. Call 104 for free health helpline. - CareBot India",
      "HEALTH ALERT: Malaria season active. Use mosquito nets at night. Free treatment at nearest PHC. - CareBot India",
      "HEALTH NOTICE: Free Diabetes & Thyroid screening at your nearest PHC under Ayushman Bharat. Call 1800-11-4477. - CareBot India",
      "HEALTH ALERT: Post-monsoon Cholera risk. Drink only boiled/filtered water. ORS available free at PHC. - CareBot India",
      "HEALTH NOTICE: COVID-19 variants active. Wear masks in crowded areas. Complete your vaccination. - CareBot India"
    ];

    const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
    const userName = (name || "User").trim();
    const message = `Hello ${userName}! ${randomAlert}`;


    // Twilio SMS API
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        From: process.env.TWILIO_PHONE_NUMBER,
        To: "+91" + mobileStr,
        Body: message
      })
    });

    const data = await response.json();
    console.log("Twilio response:", JSON.stringify(data));

    if (data.sid) {
      res.json({ success: true, message: "SMS sent successfully!" });
    } else {
      res.status(500).json({ error: "SMS failed: " + data.message });
    }
  } catch (error) {
    console.error("SMS Error:", error.message);
    res.status(500).json({ error: "SMS service unavailable" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ HealthBot running at http://localhost:${PORT}`);
});