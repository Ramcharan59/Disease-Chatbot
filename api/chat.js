require("dotenv").config();

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
- If user writes in Hindi, Telugu, Tamil or any Indian language, reply in that same language.
- Keep responses simple, friendly, and under 250 words.
- Mention free government health services like Ayushman Bharat where relevant.`;

const langMap = {
  en: "You MUST reply in English only.",
  hi: "You MUST reply in Hindi only. Always use Devanagari script for every word.",
  te: "You MUST reply in Telugu only. Always use Telugu script for every word."
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      return res.status(500).json({ error: data.error?.message || "Groq API error" });
    }

    const botReply = data.choices?.[0]?.message?.content;
    res.json({ message: botReply });

  } catch (error) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};