const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");
const mysql = require('mysql2')
require('dotenv').config()
const app = express();
app.use(express.json());

const openai = new OpenAI({apiKey:process.env.CHATGPT_APIKEY});
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN
const connection = mysql.createConnection(process.env.DATABASE_URL)
const PORT = process.env.PORT || 4000;

// ตรวจสอบสถานะการเชื่อมต่อ
connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to database success');
});

const chatHistory = {};
// Endpoint สำหรับ Webhook
app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  // ตรวจสอบว่ามี Event หรือไม่
  if (!events || events.length === 0) {
    return res.status(200).send("No events");
  }

  // จัดการ Event
  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      console.log("test");
      await handleTextMessage(event);
    }
  }

  res.status(200).send("OK");
});

// ฟังก์ชันตอบข้อความ
async function handleTextMessage(event) {
  const replyToken = event.replyToken;
  const userMessage = event.message.text;
  const userId = event.source.userId;

  // ตรวจสอบว่ามีประวัติของ userId นี้หรือยัง
  if (!chatHistory[userId]) {
    chatHistory[userId] = []; // ถ้ายังไม่มี ให้สร้าง array ใหม่
  }

  // เพิ่มข้อความของผู้ใช้ในประวัติ
  chatHistory[userId].push({ role: "user", content: userMessage });
  let replyText = await getAIResponse(userMessage, userId);
  if(replyText == false){
    replyText = 'AI จินพังงะ รอซ่อมแปปน้า มันเป็นตัวฟรีงะ 😢'
  }
  chatHistory[userId].push({ role: "assistant", content: replyText })
  // let replyText ="asdasdas"
  // ส่งข้อความกลับไปยัง LINE
  try {
    await axios.post(
      "https://api.line.me/v2/bot/message/reply",
      {
        replyToken: replyToken,
        messages: [
          {
            type: "text",
            text: replyText,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
        },
      }
    );
    // console.log("Message sent:", replyText);
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response?.data || error.message
    );
  }
}

// ฟังก์ชันสำหรับเรียก OpenAI API
async function getAIResponse(userMessage,userId) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // เลือกโมเดลที่ต้องการ เช่น 'gpt-3.5-turbo' หรือ 'gpt-4'
      messages: [
        {
          role: "system",
          content: `
            คุณคือ ผู้ชายมีชื่อว่า จิณณวัตร หาญฤทธิ์ ชื่อเล่น จิน 
            เป็นแฟนของ 
            สกาวรัตน์ จะนะ ชื่อเล่น หมิว 
            เพื่อให้คุณเป็นตัวเค้าแทนตอนที่เค้าไม่ว่างตอบแชท
            คุณเป็น แฟนที่น่ารัก ใจดี ใส่ใจ โรแมนติก และดูแล อบอุ่น
            หมิวเกิดวันที่ 14 พฤษภาคม ชอบกิน สตอเบอร์รี่ เค้กกล้วยหอม ทุกอย่างที่เป็นหมาล่า ชอบงอแง ไม่ชอบอาบน้ำ มีแมวชื่อโชกี้ 
          `,
        },
        ...(chatHistory[userId] || []),
        // { role: "user", content: userMessage },
      ],
    });

    const replyText = response.choices[0].message.content.trim();
    return replyText;
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    return false;
  }
}

// เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} v1.0`);
});
