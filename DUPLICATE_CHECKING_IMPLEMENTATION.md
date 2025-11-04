# Duplicate Checking System Implementation Plan
## Using AI SDK v5 Patterns from This Course

This document outlines how we can implement the T-Mobile/Scopeworker duplicate checking requirements using the patterns and techniques taught in this AI SDK v5 crash course.

---

## 🎯 Requirements Overview

From the document, the key requirements are:

1. **Base Feature**: Detect duplicate line items before awarding contracts/RFx/quotes
2. **AI-Powered Detection**: Use AI to identify duplicates in variable-cost items with free-text details
3. **Warning System**: Show warnings with exportable details
4. **Questionnaire**: Configurable questionnaire for acknowledging duplicates
5. **Reporting**: Capture and report duplicate data to T-Mobile DSNA

---

## 🛠️ What We Can Build with AI SDK v5

### 1. **AI-Powered Duplicate Detection Engine**

#### Pattern: Tool Calling + Retrieval + Workflows
**Course References:**
- `exercises/03-agents/03.01-tool-calling/` - Tool calling for database queries
- `exercises/05-context-engineering/05.04-retrieval/` - Retrieval patterns
- `exercises/08-agents-and-workflows/08.01-workflow/` - Multi-step workflows

**Implementation:**

```typescript
// api/duplicate-check.ts
import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Tool to query existing contracts
const searchExistingContracts = tool({
  description: 'Search for existing awarded contracts matching site, POR, and line items',
  inputSchema: z.object({
    siteId: z.string(),
    porId: z.string().optional(),
    lineItemIds: z.array(z.string()),
  }),
  execute: async ({ siteId, porId, lineItemIds }) => {
    // Query database for existing contracts
    return await db.queryContracts({ siteId, porId, lineItemIds });
  },
});

// Tool to get variable-cost line item details
const getVariableCostDetails = tool({
  description: 'Retrieve variable-cost line item details with free-text components',
  inputSchema: z.object({
    contractId: z.string(),
    lineItemId: z.string(),
  }),
  execute: async ({ contractId, lineItemId }) => {
    return await db.getLineItemDetails(contractId, lineItemId);
  },
});

// AI-powered duplicate detection for variable-cost items
export async function detectVariableCostDuplicates(
  newLineItem: VariableCostLineItem,
  existingContracts: Contract[]
) {
  const result = await streamText({
    model: google('gemini-2.0-flash'),
    tools: { getVariableCostDetails },
    system: `You are a duplicate detection system for contract line items.
    
    Your task is to determine if two variable-cost line items represent the same work activity,
    even if they have different wording in their free-text details field.
    
    Consider:
    - Semantic similarity of the work described
    - Location/site context
    - Time context (if relevant)
    - Technical specifications
    
    Return a structured analysis with:
    - similarity_score: 0-1
    - is_duplicate: boolean
    - reasoning: string explaining your decision`,
    prompt: `
      Compare these two variable-cost line items:
      
      NEW LINE ITEM:
      Site: ${newLineItem.site}
      POR: ${newLineItem.por}
      Line Item: ${newLineItem.name}
      Details: ${newLineItem.details}
      
      EXISTING LINE ITEM:
      Site: ${existingLineItem.site}
      POR: ${existingLineItem.por}
      Line Item: ${existingLineItem.name}
      Details: ${existingLineItem.details}
      
      Are these duplicates? Consider semantic meaning, not just exact text matches.
    `,
  });
  
  return await result.text;
}
```

**What This Achieves:**
- ✅ Uses AI to detect semantic duplicates in free-text details
- ✅ Leverages tool calling to query existing contracts
- ✅ Follows the workflow pattern for multi-step analysis

---

### 2. **Streaming Duplicate Warnings to UI**

#### Pattern: Custom Data Parts + Streaming
**Course References:**
- `exercises/07-streaming/07.01-custom-data-parts/` - Custom data streaming
- `exercises/07-streaming/07.02-custom-data-parts-with-stream-object/` - Structured streaming

**Implementation:**

```typescript
// api/check-duplicates.ts
import { google } from '@ai-sdk/google';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from 'ai';

export type DuplicateCheckMessage = UIMessage<
  never,
  {
    'duplicate-warning': {
      duplicates: Array<{
        lineItemId: string;
        lineItemName: string;
        existingContractId: string;
        existingContractNumber: string;
        similarityScore: number;
        aiReasoning: string;
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

export const POST = async (req: Request): Promise<Response> => {
  const body = await req.json();
  const { awardData, messages } = body;

  const stream = createUIMessageStream<DuplicateCheckMessage>({
    execute: async ({ writer }) => {
      // Step 1: Perform duplicate detection
      const duplicateCheckResult = await checkForDuplicates(awardData);
      
      // Step 2: Stream initial response
      const analysisStream = streamText({
        model: google('gemini-2.0-flash'),
        system: `You are analyzing contract awards for potential duplicates.
        
        Generate a clear, user-friendly summary of duplicate findings.`,
        prompt: `Analyze these duplicate findings and provide a summary:
        ${JSON.stringify(duplicateCheckResult, null, 2)}`,
      });

      writer.merge(analysisStream.toUIMessageStream());
      await analysisStream.consumeStream();

      // Step 3: Stream duplicate warnings as custom data parts
      if (duplicateCheckResult.duplicates.length > 0) {
        const warningId = crypto.randomUUID();
        
        writer.write({
          type: 'duplicate-warning',
          data: {
            duplicates: duplicateCheckResult.duplicates,
            requiresAcknowledgment: true,
          },
          id: warningId,
        });

        // Stream summary
        const summaryId = crypto.randomUUID();
        writer.write({
          type: 'duplicate-summary',
          data: {
            totalDuplicates: duplicateCheckResult.duplicates.length,
            totalLineItems: awardData.lineItems.length,
            warningLevel: calculateWarningLevel(duplicateCheckResult),
          },
          id: summaryId,
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
};
```

**What This Achieves:**
- ✅ Streams duplicate warnings in real-time
- ✅ Uses custom data parts for structured duplicate information
- ✅ Provides exportable data (can be copied/downloaded from frontend)
- ✅ Shows progressive results as analysis completes

---

### 3. **Configurable Questionnaire System**

#### Pattern: Streaming Objects + Message Parts
**Course References:**
- `exercises/01-ai-sdk-basics/01.10-streaming-objects/` - Structured output
- `exercises/03-agents/03.02-message-parts/` - Message parts handling

**Implementation:**

```typescript
// api/questionnaire.ts
import { google } from '@ai-sdk/google';
import { generateObject, streamText } from 'ai';
import { z } from 'zod';

const QuestionnaireResponseSchema = z.object({
  acknowledged: z.boolean(),
  reason: z.string().optional(),
  overrideReason: z.enum([
    'different_work_scope',
    'different_timeline',
    'approved_by_procurement',
    'other',
  ]).optional(),
  additionalComments: z.string().optional(),
});

export async function generateQuestionnaireResponse(
  questionnaireConfig: QuestionnaireConfig,
  duplicateFindings: DuplicateFinding[]
) {
  // Generate questionnaire based on config
  const result = await generateObject({
    model: google('gemini-2.0-flash'),
    schema: QuestionnaireResponseSchema,
    prompt: `
      Generate a questionnaire response based on this configuration:
      
      ${JSON.stringify(questionnaireConfig, null, 2)}
      
      The user is acknowledging ${duplicateFindings.length} duplicate findings.
      Required fields: ${questionnaireConfig.requiredFields.join(', ')}
    `,
  });

  return result.object;
}

// Stream questionnaire to frontend
export async function streamQuestionnairePrompt(
  config: QuestionnaireConfig
) {
  const stream = streamText({
    model: google('gemini-2.0-flash'),
    system: `You are a contract duplicate acknowledgment system.
    
    Present the questionnaire clearly and guide the user through required fields.`,
    prompt: `
      Present this questionnaire to the user:
      ${JSON.stringify(config.fields, null, 2)}
      
      Required fields: ${config.requiredFields.join(', ')}
      Field types: ${config.fields.map(f => `${f.name}: ${f.type}`).join(', ')}
    `,
  });

  return stream;
}
```

**What This Achieves:**
- ✅ Uses structured output (streaming objects) for questionnaire responses
- ✅ Configurable field types (dropdown, multiselect, checkbox, free-text)
- ✅ Validates required vs optional fields
- ✅ Can repurpose SBA questionnaire components

---

### 4. **Workflow-Based Duplicate Checking**

#### Pattern: Generator-Evaluator Workflow
**Course References:**
- `exercises/08-agents-and-workflows/08.01-workflow/` - Multi-step workflows
- `exercises/08-agents-and-workflows/08.03-creating-your-own-loop/` - Custom loops

**Implementation:**

```typescript
// api/award-workflow.ts
import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';

export async function executeAwardWorkflow(awardData: AwardData) {
  // Step 1: Generate duplicate check analysis
  const duplicateAnalysis = await generateText({
    model: google('gemini-2.0-flash'),
    system: `You are analyzing contracts for duplicates.
    
    Generate a comprehensive analysis of potential duplicates.`,
    prompt: `Analyze this award for duplicates:
    ${JSON.stringify(awardData, null, 2)}`,
  });

  // Step 2: Evaluate the findings
  const evaluation = await generateText({
    model: google('gemini-2.0-flash'),
    system: `You are evaluating duplicate findings.
    
    Determine if the findings require user acknowledgment or can be auto-resolved.`,
    prompt: `
      Evaluate these duplicate findings:
      ${duplicateAnalysis.text}
      
      Should the user be warned? What's the severity?
    `,
  });

  // Step 3: Generate final response/action
  const finalResponse = streamText({
    model: google('gemini-2.0-flash'),
    system: `You are a contract award system.
    
    Present the final duplicate check results and next steps.`,
    prompt: `
      Based on this analysis and evaluation:
      Analysis: ${duplicateAnalysis.text}
      Evaluation: ${evaluation.text}
      
      Generate the final response for the user.
    `,
  });

  return finalResponse;
}
```

**What This Achieves:**
- ✅ Multi-step analysis (generate → evaluate → respond)
- ✅ Better accuracy through evaluation step
- ✅ Deterministic workflow for award process

---

### 5. **Guardrails for Duplicate Detection**

#### Pattern: Guardrails Pattern
**Course References:**
- `exercises/09-advanced-patterns/09.01-guardrails/` - Guardrails implementation

**Implementation:**

```typescript
// api/duplicate-guardrail.ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const GUARDRAIL_SYSTEM = `You are a duplicate detection guardrail system.

Before processing duplicate checks, verify:
1. The award data is valid and complete
2. The line items are properly formatted
3. Required fields (site, POR, line items) are present
4. The request is not malicious or malformed

Return:
- "1" if the request is safe to process
- "0" if the request should be rejected

Only return the number, nothing else.`;

export async function checkDuplicateGuardrail(awardData: AwardData) {
  const result = await generateText({
    model: google('gemini-2.0-flash-lite'), // Fast, lightweight model
    system: GUARDRAIL_SYSTEM,
    prompt: `
      Validate this award data before duplicate checking:
      ${JSON.stringify(awardData, null, 2)}
    `,
    maxTokens: 1, // Only need 0 or 1
  });

  return result.text.trim() === '1';
}
```

**What This Achieves:**
- ✅ Fast validation before expensive duplicate checks
- ✅ Prevents processing invalid/malformed requests
- ✅ Uses lightweight model for speed

---

### 6. **Reporting & Analytics Integration**

#### Pattern: Custom Data Parts + Langfuse Integration
**Course References:**
- `exercises/06-evals/06.07-langfuse-basics/` - Langfuse for monitoring
- `exercises/07-streaming/07.03-message-metadata/` - Message metadata

**Implementation:**

```typescript
// api/duplicate-reporting.ts
import { langfuse } from './langfuse';
import { streamText } from 'ai';

export async function logDuplicateCheck(
  awardData: AwardData,
  findings: DuplicateFinding[],
  userResponse?: QuestionnaireResponse
) {
  const trace = langfuse.trace({
    sessionId: awardData.sessionId,
    metadata: {
      awardType: awardData.type,
      siteId: awardData.siteId,
      porId: awardData.porId,
      duplicateCount: findings.length,
    },
  });

  // Log the duplicate check
  trace.generation({
    name: 'duplicate-check',
    model: 'gemini-2.0-flash',
    input: awardData,
    output: findings,
    metadata: {
      totalLineItems: awardData.lineItems.length,
      duplicateLineItems: findings.length,
    },
  });

  // Log user acknowledgment if provided
  if (userResponse) {
    trace.event({
      name: 'duplicate-acknowledgment',
      metadata: {
        acknowledged: userResponse.acknowledged,
        reason: userResponse.reason,
        overrideReason: userResponse.overrideReason,
      },
    });
  }

  await langfuse.flushAsync();

  // Prepare data for DSNA delta sharing
  return {
    duplicateFindings: findings,
    acknowledgment: userResponse,
    timestamp: new Date().toISOString(),
  };
}
```

**What This Achieves:**
- ✅ Tracks duplicate checks for analytics
- ✅ Captures user acknowledgments
- ✅ Integrates with Langfuse for monitoring
- ✅ Prepares data for DSNA export

---

### 7. **Retrieval-Augmented Duplicate Detection**

#### Pattern: Retrieval + Context Engineering
**Course References:**
- `exercises/05-context-engineering/05.04-retrieval/` - Retrieval patterns
- `exercises/05-context-engineering/05.03-exemplars/` - Using examples

**Implementation:**

```typescript
// api/retrieval-duplicate-check.ts
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function retrievalBasedDuplicateCheck(
  newLineItem: LineItem,
  vectorStore: VectorStore
) {
  // Step 1: Retrieve similar line items from vector store
  const similarItems = await vectorStore.similaritySearch({
    query: newLineItem.details,
    filter: {
      siteId: newLineItem.siteId,
      porId: newLineItem.porId,
    },
    limit: 10,
  });

  // Step 2: Use AI to analyze retrieved items
  const result = await streamText({
    model: google('gemini-2.0-flash'),
    system: `You are analyzing line items for duplicates.
    
    Use the retrieved similar items to determine if the new line item is a duplicate.`,
    prompt: `
      NEW LINE ITEM:
      ${JSON.stringify(newLineItem, null, 2)}
      
      SIMILAR EXISTING ITEMS (retrieved from database):
      ${JSON.stringify(similarItems, null, 2)}
      
      Determine if any of these are duplicates of the new line item.
      Consider semantic similarity, not just exact matches.
    `,
  });

  return result;
}
```

**What This Achieves:**
- ✅ Uses retrieval to find similar items efficiently
- ✅ Provides context to AI for better duplicate detection
- ✅ Scales to large databases

---

## 📋 Implementation Roadmap

### Phase 1: Core Duplicate Detection
1. ✅ Set up tool calling for database queries
2. ✅ Implement basic duplicate detection (exact matches)
3. ✅ Add AI-powered variable-cost duplicate detection
4. ✅ Create duplicate checking workflow

### Phase 2: UI Integration
1. ✅ Stream duplicate warnings as custom data parts
2. ✅ Build frontend components to display warnings
3. ✅ Implement export functionality (copy/download)

### Phase 3: Questionnaire System
1. ✅ Create configurable questionnaire generator
2. ✅ Stream questionnaire prompts
3. ✅ Capture and validate responses
4. ✅ Store responses for reporting

### Phase 4: Reporting & Analytics
1. ✅ Integrate Langfuse for monitoring
2. ✅ Create duplicate check logging
3. ✅ Prepare data for DSNA export
4. ✅ Build analytics dashboard

### Phase 5: Advanced Features
1. ✅ Add guardrails for request validation
2. ✅ Implement retrieval-augmented detection
3. ✅ Add exemplar-based detection
4. ✅ Optimize for performance

---

## 🎓 Key AI SDK Patterns Used

| Requirement | AI SDK Pattern | Course Exercise |
|------------|----------------|-----------------|
| Database queries | Tool Calling | `03.01-tool-calling` |
| AI duplicate detection | `streamText` + prompts | `01.04-generating-text` |
| Streaming warnings | Custom Data Parts | `07.01-custom-data-parts` |
| Questionnaire | Streaming Objects | `01.10-streaming-objects` |
| Multi-step workflow | Workflows | `08.01-workflow` |
| Request validation | Guardrails | `09.01-guardrails` |
| Similarity search | Retrieval | `05.04-retrieval` |
| Monitoring | Langfuse | `06.07-langfuse-basics` |

---

## 💡 Benefits of Using AI SDK v5

1. **Streaming**: Real-time duplicate warnings as they're detected
2. **Type Safety**: Full TypeScript support for all data structures
3. **Multi-Provider**: Can switch between OpenAI, Anthropic, Google easily
4. **Tool Integration**: Easy database queries via tool calling
5. **Production Ready**: Built-in monitoring, error handling, and telemetry
6. **Modular**: Each component can be developed and tested independently

---

## 🚀 Next Steps

1. Set up a new exercise folder: `exercises/10-duplicate-checking/`
2. Implement each phase incrementally
3. Test with sample contract data
4. Integrate with existing Scopeworker database
5. Deploy to staging environment

---

## 📚 Reference Exercises

- **Tool Calling**: `exercises/03-agents/03.01-tool-calling/`
- **Custom Data Streaming**: `exercises/07-streaming/07.01-custom-data-parts/`
- **Workflows**: `exercises/08-agents-and-workflows/08.01-workflow/`
- **Guardrails**: `exercises/09-advanced-patterns/09.01-guardrails/`
- **Langfuse**: `exercises/06-evals/06.07-langfuse-basics/`

