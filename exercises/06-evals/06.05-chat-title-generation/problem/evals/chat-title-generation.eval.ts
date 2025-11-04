import { google } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { evalite } from 'evalite';
import { readFileSync } from 'fs';
import Papa from 'papaparse';
import path from 'path';
import z from 'zod';

const csvFile = readFileSync(
  path.join(import.meta.dirname, '../../titles-dataset.csv'),
  'utf-8',
);

const data = Papa.parse<{ Input: string; Output: string }>(
  csvFile,
  {
    header: true,
    skipEmptyLines: true,
  },
);

const EVAL_DATA_SIZE = 25;

const dataForEvalite = data.data
  .slice(0, EVAL_DATA_SIZE)
  .map((row) => ({
    input: row.Input,
    expected: row.Output,
  }));

const QUALITY_PROMPT = `

Your job is to work out if the output is comparable in quality to the expected output.

Reply with a score of A, B, C or D.

A: The output is comparable in quality to the expected output.
B: The output is not comparable in quality to the expected output.
C: The output is significantly different from the expected output.
D: The output is completely different from the expected output.
`;

evalite('Chat Title Generation', {
  data: () => dataForEvalite,
  task: async (input) => {
    const result = await generateText({
      model: google('gemini-2.0-flash-lite'),
      prompt: `
         <task-context>
        You are a helpful assistant that can generate titles for conversations.
        </task-context>

        <conversation-history>
        ${input}
        </conversation-history>
        
        <rules>
        Find the most concise title that captures the essence of the conversation.
        Titles should be at most 35 characters. DO NOT exceed this length.
        Titles should be formatted in sentence case, with capital letters at the start of each word. Do not provide a period at the end.
        </rules>

        <the-ask>
        Generate a title for the conversation.
        </the-ask>

        <output-format>
        Return only the title.
        </output-format>
          `,
    });

    return result.text;
  },
  scorers: [
    {
      name: 'Length',
      scorer: ({ input, output, expected }) => {
        return output.length <= 35 ? 1 : 0;
      },
    },
    //   Implement an LLM-as-judge scorer
    // - Create a scorer that compares the quality of your output to the expected output
    {
      name: 'Quality',
      scorer: async ({ input, output, expected }) => {
        const result = await generateObject({
          model: google('gemini-2.0-flash'),
          system: QUALITY_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `
                  The conversation history is:
    
                  ${input}
    
                  The generated title you are evaluating is:
    
                  ${output}
    
                  The desired title is:
    
                  ${expected}`,
                },
              ],
            },
          ],
          schema: z.object({
            score: z.enum(['A', 'B', 'C', 'D']),
            feedback: z
              .string()
              .describe('A short feedback about the answer'),
          }),
        });

        const scoreMap = {
          A: 1,
          B: 0.75,
          C: 0,
          D: 0,
        };

        return {
          score: scoreMap[result.object.score],
          metadata: result.object.feedback,
        };
      },
    },
  ],
});
