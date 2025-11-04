# Duplicate Checking System Architecture
## Visual Flow & Component Mapping

## 🔄 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Awards Contract/RFx/Quote                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Guardrail Check (09.01-guardrails)            │
│  - Validate award data                                           │
│  - Check for malformed requests                                  │
│  - Fast lightweight model (gemini-2.0-flash-lite)               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Database Query via Tool Calling                     │
│              (03.01-tool-calling pattern)                        │
│                                                                   │
│  Tools:                                                          │
│  - searchExistingContracts(siteId, porId, lineItemIds)          │
│  - getVariableCostDetails(contractId, lineItemId)                │
│  - getLineItemMapping(lineItemId)                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Fixed-Cost Duplicate Detection                     │
│              (Simple ID-based matching)                          │
│                                                                   │
│  ✅ Match by: Line Item ID + Site + POR                          │
│  ❌ No AI needed for exact matches                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         Variable-Cost AI Duplicate Detection                     │
│         (05.04-retrieval + 01.04-generating-text)               │
│                                                                   │
│  1. Retrieve similar items (vector similarity search)            │
│  2. AI analysis with streamText:                                 │
│     - Semantic similarity of free-text details                    │
│     - Context (site, POR, timeline)                               │
│     - Returns: similarity_score, is_duplicate, reasoning          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Workflow Evaluation Step                            │
│              (08.01-workflow pattern)                            │
│                                                                   │
│  Generate → Evaluate → Respond                                   │
│  - Determine severity                                            │
│  - Decide if acknowledgment required                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         Stream Duplicate Warnings to UI                          │
│         (07.01-custom-data-parts pattern)                        │
│                                                                   │
│  Custom Data Parts:                                              │
│  - duplicate-warning: { duplicates[], requiresAcknowledgment }    │
│  - duplicate-summary: { totalDuplicates, warningLevel }         │
│                                                                   │
│  ✅ Real-time streaming                                          │
│  ✅ Exportable data (copy/download)                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              User Acknowledgment                                 │
│              (Configurable Questionnaire)                         │
│              (01.10-streaming-objects pattern)                  │
│                                                                   │
│  Stream questionnaire prompt:                                    │
│  - Dropdown fields                                               │
│  - Multiselect                                                   │
│  - Checkbox (single-click)                                       │
│  - Free-text                                                     │
│                                                                   │
│  Capture response with structured output                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Logging & Reporting                                 │
│              (06.07-langfuse-basics pattern)                     │
│                                                                   │
│  Langfuse Trace:                                                 │
│  - Duplicate check results                                       │
│  - User acknowledgment                                           │
│  - Metadata (site, POR, line items)                              │
│                                                                   │
│  DSNA Export:                                                    │
│  - Delta sharing integration                                     │
│  - Duplicate findings + questionnaire responses                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component Breakdown

### 1. **Guardrail Component** (`exercises/09-advanced-patterns/09.01-guardrails/`)

```
┌─────────────────────┐
│  Award Data Input   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐      ┌──────────────────────┐
│  Guardrail Check    │─────▶│  generateText()      │
│  (Fast validation)  │      │  gemini-2.0-flash-lite│
└──────────┬──────────┘      └──────────────────────┘
           │
           ├───▶ "1" → Continue
           │
           └───▶ "0" → Reject with error message
```

**Purpose**: Fast pre-validation before expensive duplicate checks

---

### 2. **Database Query Tools** (`exercises/03-agents/03.01-tool-calling/`)

```typescript
// Tool definitions
const tools = {
  searchExistingContracts: tool({
    description: 'Search for existing awarded contracts',
    inputSchema: z.object({
      siteId: z.string(),
      porId: z.string().optional(),
      lineItemIds: z.array(z.string()),
    }),
    execute: async (params) => {
      // Database query
      return await db.queryContracts(params);
    },
  }),
  
  getVariableCostDetails: tool({
    description: 'Get variable-cost line item details',
    // ...
  }),
};
```

**Purpose**: Enable AI to query database via tool calling

---

### 3. **AI Duplicate Detection** (`exercises/05-context-engineering/05.04-retrieval/`)

```
┌──────────────────────────────────────────┐
│  Variable-Cost Line Item                │
│  - Site: ABC123                         │
│  - POR: POR-456                         │
│  - Details: "Install fiber optic cable" │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Vector Similarity Search                │
│  (Retrieve top 10 similar items)         │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  AI Analysis (streamText)                │
│  Model: gemini-2.0-flash                 │
│                                           │
│  Prompt:                                  │
│  - Compare semantic meaning               │
│  - Consider context                       │
│  - Return similarity score                │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Result:                                 │
│  {                                       │
│    similarity_score: 0.87,               │
│    is_duplicate: true,                   │
│    reasoning: "Both describe..."         │
│  }                                       │
└──────────────────────────────────────────┘
```

**Purpose**: Semantic duplicate detection for free-text fields

---

### 4. **Streaming Warnings** (`exercises/07-streaming/07.01-custom-data-parts/`)

```typescript
// Custom message type
type DuplicateCheckMessage = UIMessage<
  never,
  {
    'duplicate-warning': DuplicateWarningData;
    'duplicate-summary': SummaryData;
  }
>;

// Streaming flow
createUIMessageStream<DuplicateCheckMessage>({
  execute: async ({ writer }) => {
    // 1. Stream AI analysis text
    writer.merge(analysisStream.toUIMessageStream());
    
    // 2. Stream custom data parts
    writer.write({
      type: 'duplicate-warning',
      data: { duplicates: [...], requiresAcknowledgment: true },
      id: crypto.randomUUID(),
    });
  },
});
```

**Purpose**: Real-time streaming of duplicate warnings to frontend

---

### 5. **Questionnaire System** (`exercises/01-ai-sdk-basics/01.10-streaming-objects/`)

```
┌──────────────────────────────────────────┐
│  Questionnaire Config (Backend)          │
│  {                                       │
│    fields: [                             │
│      { name: "reason", type: "dropdown" },│
│      { name: "comments", type: "text" }  │
│    ],                                    │
│    requiredFields: ["reason"]            │
│  }                                       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Stream Questionnaire Prompt             │
│  (streamText)                           │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Capture Response                        │
│  (generateObject with schema)            │
│                                           │
│  Schema:                                 │
│  {                                       │
│    acknowledged: boolean,                │
│    reason: string,                       │
│    comments: string                      │
│  }                                       │
└──────────────────────────────────────────┘
```

**Purpose**: Configurable acknowledgment questionnaire

---

### 6. **Workflow Pattern** (`exercises/08-agents-and-workflows/08.01-workflow/`)

```
┌─────────────────┐
│  Step 1: Generate│
│  (generateText)  │
│  Duplicate       │
│  Analysis        │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Step 2: Evaluate│
│  (generateText)  │
│  Severity &      │
│  Action Required │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│  Step 3: Respond│
│  (streamText)   │
│  Final Message   │
│  to User         │
└─────────────────┘
```

**Purpose**: Multi-step deterministic workflow for duplicate checking

---

### 7. **Monitoring & Reporting** (`exercises/06-evals/06.07-langfuse-basics/`)

```typescript
// Langfuse integration
const trace = langfuse.trace({
  sessionId: awardData.sessionId,
  metadata: {
    awardType: 'contract',
    duplicateCount: findings.length,
  },
});

trace.generation({
  name: 'duplicate-check',
  input: awardData,
  output: findings,
});

trace.event({
  name: 'duplicate-acknowledgment',
  metadata: userResponse,
});
```

**Purpose**: Track duplicate checks for analytics and DSNA export

---

## 🔗 Data Flow Diagram

```
┌──────────────┐
│   Frontend   │
│   (React)    │
└──────┬───────┘
       │ POST /api/check-duplicates
       ▼
┌─────────────────────────────────────────────┐
│  API Route: /api/check-duplicates           │
│  (exercises/07-streaming/07.01 pattern)     │
└──────┬──────────────────────────────────────┘
       │
       ├───▶ Guardrail Check
       │    (09.01-guardrails)
       │
       ├───▶ Tool: searchExistingContracts
       │    (03.01-tool-calling)
       │
       ├───▶ AI Duplicate Detection
       │    (05.04-retrieval + streamText)
       │
       ├───▶ Workflow Evaluation
       │    (08.01-workflow)
       │
       ├───▶ Stream Warnings
       │    (07.01-custom-data-parts)
       │
       ├───▶ Stream Questionnaire
       │    (01.10-streaming-objects)
       │
       └───▶ Log to Langfuse
            (06.07-langfuse-basics)
            │
            └───▶ Export to DSNA
```

---

## 📊 Technology Stack Mapping

| Component | AI SDK Pattern | Implementation |
|-----------|---------------|----------------|
| **Database Queries** | Tool Calling | `tool()` with Zod schemas |
| **AI Analysis** | `streamText()` | Gemini 2.0 Flash |
| **Streaming** | Custom Data Parts | `createUIMessageStream()` |
| **Structured Output** | Streaming Objects | `generateObject()` |
| **Workflows** | Multi-step calls | `generateText()` → `streamText()` |
| **Validation** | Guardrails | `generateText()` with fast model |
| **Monitoring** | Langfuse | `langfuse.trace()` |
| **Retrieval** | Vector Search | External vector DB + context |

---

## 🎯 Key Advantages of This Architecture

1. **Real-time Feedback**: Streaming keeps users informed as duplicates are detected
2. **Type Safety**: Full TypeScript types for all data structures
3. **Modular**: Each component can be developed/tested independently
4. **Scalable**: Tool calling enables efficient database queries
5. **Observable**: Langfuse integration for monitoring and debugging
6. **Flexible**: Easy to swap AI models or add new features

---

## 🚀 Getting Started

1. **Start with Guardrails** (`exercises/09-advanced-patterns/09.01-guardrails/`)
   - Fast validation before expensive operations

2. **Add Tool Calling** (`exercises/03-agents/03.01-tool-calling/`)
   - Enable database queries from AI

3. **Implement Streaming** (`exercises/07-streaming/07.01-custom-data-parts/`)
   - Stream duplicate warnings to UI

4. **Add Workflows** (`exercises/08-agents-and-workflows/08.01-workflow/`)
   - Multi-step duplicate detection process

5. **Integrate Monitoring** (`exercises/06-evals/06.07-langfuse-basics/`)
   - Track and report duplicate checks

