import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { evalite } from 'evalite';

const links = [
  {
    title: 'TypeScript 5.8',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html',
  },
  {
    title: 'TypeScript 5.7',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html',
  },
  {
    title: 'TypeScript 5.6',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html',
  },
  {
    title: 'TypeScript 5.5',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html',
  },
  {
    title: 'TypeScript 5.4',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html',
  },
  {
    title: 'TypeScript 5.3',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html',
  },
  {
    title: 'TypeScript 5.2',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html',
  },
  {
    title: 'TypeScript 5.1',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-1.html',
  },
  {
    title: 'TypeScript 5.0',
    url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html',
  },
];

evalite('TS Release Notes', {
  data: () => [
    {
      input: 'Tell me about the TypeScript 5.8 release',
    },
    {
      input: 'Tell me about the TypeScript 5.2 release',
    },
  ],
  task: async (input) => {
    const capitalResult = await generateText({
      model: google('gemini-2.0-flash-lite'),
      prompt: `
        You are a helpful assistant that can answer questions about TypeScript releases.

        <question>
        ${input}
        </question>
        
        ALWAYS include markdown links to correct typescript version documentation in your output.
        ALWAYS be extremely concise in your output. Keep it under 500 characters.
      `,
    });

    return capitalResult.text;
  },
  scorers: [
    {
      name: 'Includes Markdown Links',
      scorer: ({ input, output, expected }) => {
        // TODO: check with regex if the output includes markdown links
        const markdownLinksRegex = /\[.*?\]\(.*?\)/g;
        const markdownLinksFound = markdownLinksRegex.test(output);
        return markdownLinksFound ? 1 : 0;
      },
    },
    {
      name: 'Output length',
      scorer: ({ input, output, expected }) => {
        // TODO: check with regex if the output is less than 500 characters
        const outputLength = output.length;
        return outputLength < 500 ? 1 : 0;
      },
    },
    {
      name: 'TypeScript Version Found in Input',
      scorer: ({ input, output, expected }) => {
        // TODO: check if TypeScript version regex matches the input
        const typescriptVersionRegex = /TypeScript (\d+\.\d+)/;
        const typescriptVersionMatch = input.match(typescriptVersionRegex);
        return typescriptVersionMatch ? 1 : 0;
      },
    },
    {
      name: 'Correct Doc Link Exists in Links',
      scorer: ({ input, output, expected }) => {
        // TODO: check if the correct doc link exists in the links array
        const typescriptVersionRegex = /TypeScript (\d+\.\d+)/;
        const typescriptVersionMatch = input.match(typescriptVersionRegex);
        if (!typescriptVersionMatch) {
          return 0;
        }

        const correctDocLink = links.find((link) => link.title.includes(typescriptVersionMatch[0]));
        return correctDocLink ? 1 : 0;
      },
    },
    {
      name: 'Correct Doc Link in Output',
      scorer: ({ input, output, expected }) => {
        // TODO: check if the output includes the correct doc link
        const typescriptVersionRegex = /TypeScript (\d+\.\d+)/;
        const typescriptVersionMatch = input.match(typescriptVersionRegex);
        if (!typescriptVersionMatch) {
          return 0;
        }

        const correctDocLink = links.find((link) => link.title.includes(typescriptVersionMatch[0]));
        if (!correctDocLink) {
          return 0;
        }

        // check just the link () without title in output with regex and return 1 if it exists, 0 if it doesn't
        const linkRegex = `\(${correctDocLink.url}\)`;
        const linkFound = output.includes(linkRegex);
        return linkFound ? 1 : 0;
      },
    },
  ],
});
