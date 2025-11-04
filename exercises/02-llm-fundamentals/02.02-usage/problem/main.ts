import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const output = streamText({
  model: google('gemini-2.0-flash-lite'),
  prompt: `Which country makes the best sausages? Answer in a single paragraph.`,
});

for await (const chunk of output.textStream) {
  process.stdout.write(chunk);
}

console.log(); // Empty log to separate the output from the usage

// TODO: Print the usage to the console
const usage = await output.usage;
console.log("usage: ", usage);