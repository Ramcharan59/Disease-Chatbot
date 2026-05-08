// api/send-sms.js — Vercel Serverless Function using Twilio
require("dotenv").config();

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { mobile, name } = req.body;

    const mobileStr = String(mobile || "").trim();
    if (!mobileStr || mobileStr.length !== 10 || isNaN(mobileStr)) {
      return res.status(400).json({ error: "Invalid mobile number. Must be 10 digits." });
    }

    const userName = (name || "User").trim();

    const alerts = [
      "Dengue cases rising in your area. Remove stagnant water, use repellents. Call 104 for free health helpline.",
      "Malaria season is active. Use mosquito nets at night. Free treatment at nearest PHC.",
      "Free Diabetes and Thyroid screening at your nearest PHC under Ayushman Bharat. Call 1800-11-4477.",
      "Post-monsoon Cholera risk. Drink only boiled or filtered water. ORS available free at PHC.",
      "COVID-19 variants active. Wear masks in crowded areas. Complete your vaccination.",
    ];

    const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
    const message = `Hello ${userName}! HEALTH ALERT: ${randomAlert} - CareBot India`;

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
      return res.json({ success: true, message: "SMS sent successfully!" });
    } else {
      console.error("Twilio error:", JSON.stringify(data));
      return res.status(500).json({ error: "SMS failed: " + data.message });
    }

  } catch (error) {
    console.error("SMS Error:", error.message);
    return res.status(500).json({ error: "SMS service unavailable: " + error.message });
  }
};