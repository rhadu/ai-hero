import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const model = google('gemini-2.0-flash');

const stream = streamText({
  model,
  prompt: 'Give me a sonnet about a cat called Steven. If you use the word "cat", I will be very angry.',
});

for await (const chunk of stream.toUIMessageStream()) {
  console.log(chunk);
}
