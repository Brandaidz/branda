const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseOptions: { baseURL: process.env.OPENROUTER_API_BASE }
});

const openai = new OpenAIApi(configuration);
module.exports = openai;
