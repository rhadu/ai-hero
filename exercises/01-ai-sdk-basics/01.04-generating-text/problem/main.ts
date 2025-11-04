import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const result = await generateText({
  model: google('gemini-2.5-pro'),
  prompt: 'Are you able to generate an image of a comic cat?',
  maxRetries: 0,
});

for (const file of result.files) {
  if (file.mediaType.startsWith('image/')) {
    // The file object provides multiple data formats:
    // Access images as base64 string, Uint8Array binary data, or check type
    // - file.base64: string (data URL format)
    // - file.uint8Array: Uint8Array (binary data)
    // - file.mediaType: string (e.g. "image/png")
    
    const extension = file.mediaType.split('/')[1];
    const filename = `output.${extension}`;
    const filepath = join(__dirname, filename);
    
    writeFileSync(filepath, file.uint8Array);
    console.log(`Image saved to: ${filepath}`);
  }
}

console.log(result.text);
