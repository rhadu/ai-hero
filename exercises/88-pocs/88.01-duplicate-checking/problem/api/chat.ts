import { google } from '@ai-sdk/google';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  streamText,
  tool,
  type ModelMessage,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import {
  getContractDetails,
  getLineItemDetails,
  getPORDetails,
  getSiteDetails,
  searchExistingContracts,
  type AwardData,
  type Contract,
  type LineItem,
} from './mock-db.ts';

// Custom message type with duplicate warning data parts
export type DuplicateCheckMessage = UIMessage<
  never,
  {
    'duplicate-warning': {
      duplicates: Array<{
        lineItemId: string;
        lineItemName: string;
        existingContractId: string;
        existingContractNumber: string;
        matchType: 'exact' | 'semantic';
        similarityScore?: number;
        aiReasoning?: string;
      }>;
      requiresAcknowledgment: boolean;
    };
    'duplicate-summary': {
      totalDuplicates: number;
      totalLineItems: number;
      warningLevel: 'low' | 'medium' | 'high';
    };
  }
>;

// Tool definitions for database queries
const searchContractsTool = tool({
  description:
    'Search for existing awarded contracts matching site, POR, and line items',
  inputSchema: z.object({
    siteId: z.string().describe('The site ID to search for'),
    porId: z
      .string()
      .describe('The POR (Project Order Request) ID'),
    lineItemIds: z
      .array(z.string())
      .describe(
        'Array of line item IDs to check for duplicates',
      ),
  }),
  execute: async ({ siteId, porId, lineItemIds }) => {
    const contracts = await searchExistingContracts({
      siteId,
      porId,
      lineItemIds,
    });
    return {
      contracts: contracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        lineItems: c.lineItems,
        awardedDate: c.awardedDate,
      })),
    };
  },
});

const getLineItemTool = tool({
  description: 'Get details about a specific line item',
  inputSchema: z.object({
    lineItemId: z.string().describe('The line item ID'),
  }),
  execute: async ({ lineItemId }) => {
    const lineItem = await getLineItemDetails(lineItemId);
    return lineItem || { error: 'Line item not found' };
  },
});

const getContractTool = tool({
  description: 'Get details about a specific contract',
  inputSchema: z.object({
    contractId: z.string().describe('The contract ID'),
  }),
  execute: async ({ contractId }) => {
    const contract = await getContractDetails(contractId);
    return contract || { error: 'Contract not found' };
  },
});

// AI-powered duplicate detection for variable-cost items
async function detectVariableCostDuplicates(
  newLineItem: {
    lineItemId: string;
    details?: string;
  },
  existingContracts: Contract[],
): Promise<{
  isDuplicate: boolean;
  similarityScore: number;
  reasoning: string;
  matchingContractId?: string;
}> {
  // Find variable-cost line items in existing contracts
  const variableCostMatches = existingContracts
    .flatMap((contract) =>
      contract.lineItems
        .filter((li) => li.lineItemId === newLineItem.lineItemId)
        .map((li) => ({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          details: li.details || '',
        })),
    )
    .filter((match) => match.details); // Only consider items with details

  if (variableCostMatches.length === 0) {
    return {
      isDuplicate: false,
      similarityScore: 0,
      reasoning:
        'No variable-cost items with details found to compare',
    };
  }

  const firstMatch = variableCostMatches[0];
  if (!firstMatch) {
    return {
      isDuplicate: false,
      similarityScore: 0,
      reasoning: 'No matching contract found',
    };
  }

  // Use AI to determine semantic similarity with structured output
  const duplicateAnalysisSchema = z.object({
    similarity_score: z
      .number()
      .min(0)
      .max(1)
      .describe('Similarity score between 0 and 1'),
    is_duplicate: z
      .boolean()
      .describe('Whether the items are duplicates (true if similarity_score > 0.7)'),
    reasoning: z
      .string()
      .describe('Explanation of the duplicate detection decision'),
  });

  try {
    const result = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: duplicateAnalysisSchema,
      system: `You are a duplicate detection system for contract line items.

Your task is to determine if two variable-cost line items represent the same work activity,
even if they have different wording in their free-text details field.

Consider:
- Semantic similarity of the work described
- Location/site context
- Technical specifications

Return a structured analysis with similarity_score (0-1), is_duplicate (true if similarity_score > 0.7), and reasoning.`,
      prompt: `
Compare these variable-cost line items:

NEW LINE ITEM:
Details: "${newLineItem.details || 'No details provided'}"

EXISTING LINE ITEM:
Details: "${firstMatch.details}"

Are these duplicates? Consider semantic meaning, not just exact text matches.
`,
    });

    return {
      isDuplicate:
        result.object.is_duplicate || result.object.similarity_score > 0.7,
      similarityScore: result.object.similarity_score,
      reasoning: result.object.reasoning,
      matchingContractId: firstMatch.contractId,
    };
  } catch (error) {
    // Fallback: simple keyword matching if AI call fails
    const newText = (newLineItem.details || '').toLowerCase();
    const existingText = firstMatch.details.toLowerCase();
    const keywords = newText
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const matches = keywords.filter((kw) =>
      existingText.includes(kw),
    ).length;
    const similarityScore =
      keywords.length > 0 ? matches / keywords.length : 0;

    return {
      isDuplicate: similarityScore > 0.5,
      similarityScore,
      reasoning: `Keyword-based similarity: ${matches}/${keywords.length} keywords match (AI analysis unavailable)`,
      matchingContractId: firstMatch.contractId,
    };
  }
}

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();
  const messages: UIMessage[] = body.messages || [];
  const awardData: AwardData | undefined = body.awardData;

  const modelMessages: ModelMessage[] =
    convertToModelMessages(messages);

  // Extract award data from request body or message text
  let extractedAwardData: AwardData | undefined = awardData;
  
  // If not in body, try to extract from message text
  if (!extractedAwardData && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      const text = lastMessage.parts
        .map((p) => (p.type === 'text' ? p.text : ''))
        .join('');

      // Check for encoded award data in message
      if (text.startsWith('CHECK_DUPLICATES_AWARD_DATA:')) {
        try {
          const jsonStr = text.replace('CHECK_DUPLICATES_AWARD_DATA:', '');
          extractedAwardData = JSON.parse(jsonStr) as AwardData;
        } catch {
          // If parsing fails, fall back to text extraction
        }
      }
      
      // Fallback: Try to extract award data from message text (legacy support)
      if (!extractedAwardData && text.includes('Site:') && text.includes('POR:')) {
        // Try to parse structured text format
        const siteMatch = text.match(/Site:\s*(\S+)/);
        const porMatch = text.match(/POR:\s*(\S+)/);
        
        if (siteMatch?.[1] && porMatch?.[1]) {
          extractedAwardData = {
            siteId: siteMatch[1],
            porId: porMatch[1],
            lineItems: [], // Will be populated from form
          };
        }
      }
    }
  }

  const stream = createUIMessageStream<DuplicateCheckMessage>({
    execute: async ({ writer }) => {
      // Step 1: Stream initial analysis message
      // Build messages array - if we have award data, add it as context
      const analysisMessages: ModelMessage[] = extractedAwardData
        ? [
            ...modelMessages,
            {
              role: 'user',
              content: `I'm about to award a contract with the following details:
        
Site ID: ${extractedAwardData.siteId}
POR ID: ${extractedAwardData.porId}
Line Items: ${extractedAwardData.lineItems.length}

Let me check for duplicates...`,
            },
          ]
        : modelMessages;

      // If we have award data, skip conversational response and go straight to checking
      if (extractedAwardData) {
        // Skip AI conversation, just show a brief status message
        const statusText = `Checking for duplicates in award:
- Site: ${extractedAwardData.siteId}
- POR: ${extractedAwardData.porId}
- Line Items: ${extractedAwardData.lineItems.length}

Analyzing existing contracts...`;

        // Write status message directly using text-start, text-delta, text-end
        const textId = crypto.randomUUID();
        writer.write({
          type: 'text-start',
          id: textId,
        });
        writer.write({
          type: 'text-delta',
          id: textId,
          delta: statusText,
        });
        writer.write({
          type: 'text-end',
          id: textId,
        });
      } else {
        // Normal conversational mode
        const analysisStream = streamText({
          model: google('gemini-2.0-flash'),
          messages: analysisMessages,
          system: `You are a contract duplicate detection system for Scopeworker.
        
Your job is to analyze award data and identify potential duplicate line items.
Be clear and helpful in explaining what duplicates were found.`,
        });

        writer.merge(analysisStream.toUIMessageStream());
        await analysisStream.consumeStream();
      }

      // Step 2: Perform duplicate detection if award data provided
      if (extractedAwardData) {
        // Skip the tool-calling AI step and go straight to duplicate detection
        // The tools are available but we'll call them directly for better control

        // Perform actual duplicate detection
        const lineItemIds = extractedAwardData.lineItems.map(
          (li) => li.lineItemId,
        );
        const existingContracts = await searchExistingContracts({
          siteId: extractedAwardData.siteId,
          porId: extractedAwardData.porId,
          lineItemIds,
        });

        const duplicates: Array<{
          lineItemId: string;
          lineItemName: string;
          existingContractId: string;
          existingContractNumber: string;
          matchType: 'exact' | 'semantic';
          similarityScore?: number;
          aiReasoning?: string;
        }> = [];

        // Check each line item for duplicates
        for (const newLineItem of extractedAwardData.lineItems) {
          const lineItem = await getLineItemDetails(
            newLineItem.lineItemId,
          );
          if (!lineItem) continue;

          // Find contracts with this line item
          const contractsWithLineItem = existingContracts.filter(
            (contract) =>
              contract.lineItems.some(
                (li) => li.lineItemId === newLineItem.lineItemId,
              ),
          );

          if (contractsWithLineItem.length > 0) {
            // Fixed-cost: exact match
            if (lineItem.type === 'fixed-cost') {
              for (const contract of contractsWithLineItem) {
                duplicates.push({
                  lineItemId: newLineItem.lineItemId,
                  lineItemName: lineItem.name,
                  existingContractId: contract.id,
                  existingContractNumber:
                    contract.contractNumber,
                  matchType: 'exact',
                });
              }
            } else {
              // Variable-cost: semantic analysis
              const aiResult =
                await detectVariableCostDuplicates(
                  newLineItem,
                  contractsWithLineItem,
                );

              if (
                aiResult.isDuplicate &&
                aiResult.matchingContractId
              ) {
                duplicates.push({
                  lineItemId: newLineItem.lineItemId,
                  lineItemName: lineItem.name,
                  existingContractId:
                    aiResult.matchingContractId,
                  existingContractNumber:
                    contractsWithLineItem.find(
                      (c) =>
                        c.id === aiResult.matchingContractId,
                    )?.contractNumber || '',
                  matchType: 'semantic',
                  similarityScore: aiResult.similarityScore,
                  aiReasoning: aiResult.reasoning,
                });
              }
            }
          }
        }

        // Step 4: Stream duplicate warnings or success message
        if (duplicates.length > 0) {
          // Found duplicates - show warnings
          const warningId = crypto.randomUUID();
          writer.write({
            type: 'data-duplicate-warning',
            data: {
              duplicates,
              requiresAcknowledgment: true,
            },
            id: warningId,
          });

          // Calculate warning level
          const warningLevel: 'low' | 'medium' | 'high' =
            duplicates.length === 1
              ? 'low'
              : duplicates.length <= 3
                ? 'medium'
                : 'high';

          const summaryId = crypto.randomUUID();
          writer.write({
            type: 'data-duplicate-summary',
            data: {
              totalDuplicates: duplicates.length,
              totalLineItems:
                extractedAwardData.lineItems.length,
              warningLevel,
            },
            id: summaryId,
          });

          // Add summary text
          const summaryTextId = crypto.randomUUID();
          writer.write({
            type: 'text-start',
            id: summaryTextId,
          });
          writer.write({
            type: 'text-delta',
            id: summaryTextId,
            delta: `\n\n⚠️ **Duplicate Check Complete**\n\nFound ${duplicates.length} duplicate line item(s) that match existing contracts. Please review the details below.`,
          });
          writer.write({
            type: 'text-end',
            id: summaryTextId,
          });
        } else {
          // No duplicates found - show success message
          const successTextId = crypto.randomUUID();
          writer.write({
            type: 'text-start',
            id: successTextId,
          });
          writer.write({
            type: 'text-delta',
            id: successTextId,
            delta: `\n\n✅ **Duplicate Check Complete**\n\nNo duplicates found! All ${extractedAwardData.lineItems.length} line item(s) are unique for this Site and POR. You can proceed with the award.`,
          });
          writer.write({
            type: 'text-end',
            id: successTextId,
          });
        }
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
};
