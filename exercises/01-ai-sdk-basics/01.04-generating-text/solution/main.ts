import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';


const model = google('gemini-2.0-flash-lite');
const modelOpenAI = openai('gpt-5-chat-latest');

const prompt = 'Generate 5 jokes about coffee with their probabilities';

const result = await generateText({
  model,
  prompt,
});

console.log(result.text);
