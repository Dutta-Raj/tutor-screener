const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyBi7nO8rgMC8iSv0A0UJDUyHzs6rX03KnY");
// Try different model names
const models = ["gemini-pro", "gemini-1.0-pro", "gemini-1.5-pro"];

async function test() {
  for (const modelName of models) {
    try {
      console.log(`Testing ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'API is working!'");
      console.log(`? ${modelName} works!`, result.response.text());
      return;
    } catch (error) {
      console.log(`? ${modelName} failed:`, error.message);
    }
  }
  console.log("\n?? None of the models worked. Please check your API key.");
}

test();
