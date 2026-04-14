// test-api.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyANvDpN9EfwWXM4Qibg6TQn9bH7V3IQYF8");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function test() {
  try {
    const result = await model.generateContent("Say 'API is working!'");
    console.log("? Success:", result.response.text());
  } catch (error) {
    console.error("? Error:", error.message);
  }
}

test();
