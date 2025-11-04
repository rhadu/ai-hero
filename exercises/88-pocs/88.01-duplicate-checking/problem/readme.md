# Duplicate Checking POC

This is a proof-of-concept implementation of an AI-powered duplicate detection system for contract awards, built using AI SDK v5 patterns from this course.

## 🎯 What This Demonstrates

This POC showcases:

1. **Tool Calling** - Database queries via AI SDK tools (`exercises/03-agents/03.01-tool-calling/`)
2. **Custom Data Parts Streaming** - Real-time duplicate warnings (`exercises/07-streaming/07.01-custom-data-parts/`)
3. **AI-Powered Semantic Detection** - Variable-cost duplicate detection using AI
4. **Workflow Pattern** - Multi-step duplicate checking process (`exercises/08-agents-and-workflows/08.01-workflow/`)
5. **Mocked Database** - Sample contract and line item data

## 🚀 Running the POC

1. Make sure you have your API keys set up in `.env`:
   ```bash
   GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
   ```

2. Run the exercise:
   ```bash
   pnpm exercise 88.01-duplicate-checking
   ```

3. Click the **"Test Award Contract"** button to trigger duplicate detection with mocked data

## 📋 Mock Data

The POC uses mocked data defined in `api/mock-db.ts`:

- **Sites**: Downtown Tower A, Suburban Office Complex, Airport Terminal
- **PORs**: Fiber Infrastructure Upgrade, Network Equipment Refresh, 5G Tower Installation
- **Line Items**: Fiber Optic Cable Installation, Network Switch, Tower Foundation, etc.
- **Existing Contracts**: 
  - PO-2025-001: Awarded for Site-001, POR-001 (Fiber Optic Cable + Network Switch)
  - PO-2025-002: Awarded for Site-001, POR-001 (Site Preparation)
  - PO-2025-003: Awarded for Site-002, POR-002 (Network Equipment)

## 🔍 How It Works

### 1. Tool Calling for Database Queries

The system uses AI SDK tools to query the mocked database:

```typescript
const searchContractsTool = tool({
  description: 'Search for existing awarded contracts...',
  inputSchema: z.object({...}),
  execute: async ({ siteId, porId, lineItemIds }) => {
    return await searchExistingContracts({ siteId, porId, lineItemIds });
  },
});
```

### 2. Duplicate Detection Flow

1. **Fixed-Cost Items**: Exact match by line item ID + Site + POR
2. **Variable-Cost Items**: AI-powered semantic analysis of free-text details

### 3. Streaming Duplicate Warnings

Warnings are streamed as custom data parts:

```typescript
writer.write({
  type: 'duplicate-warning',
  data: {
    duplicates: [...],
    requiresAcknowledgment: true,
  },
  id: crypto.randomUUID(),
});
```

### 4. UI Display

The React components display:
- **Summary Card**: Total duplicates found with warning level
- **Duplicate Details**: Each duplicate with match type, similarity score, and AI reasoning
- **Visual Indicators**: Color-coded warnings (red for exact matches, blue for semantic)

## 🧪 Test Scenarios

### Scenario 1: Exact Match (Fixed-Cost)
- Award: Site-001, POR-001, Line Item: Network Switch
- **Expected**: Exact match duplicate warning (found in PO-2025-001)

### Scenario 2: Semantic Match (Variable-Cost)
- Award: Site-001, POR-001, Line Item: Fiber Optic Cable
  - Details: "Install fiber optic cable infrastructure to connect building to main network"
- **Expected**: Semantic match duplicate warning (similar to PO-2025-001)

### Scenario 3: No Duplicates
- Award: Site-003, POR-003, Line Item: Tower Foundation
- **Expected**: No duplicates found

## 📁 File Structure

```
88.01-duplicate-checking/
├── api/
│   ├── chat.ts              # Main API route with duplicate checking logic
│   └── mock-db.ts           # Mocked database with sample data
├── client/
│   ├── components.tsx       # React components for UI
│   ├── root.tsx             # React root component
│   └── tailwind.css         # Styles
├── main.ts                  # Entry point
└── readme.md                # This file
```

## 🎓 Key AI SDK Patterns Used

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Tool Calling** | `api/chat.ts` | Query mocked database |
| **Custom Data Parts** | `api/chat.ts` | Stream duplicate warnings |
| **Streaming** | `api/chat.ts` | Real-time duplicate detection |
| **Workflows** | `api/chat.ts` | Multi-step analysis |
| **Structured Output** | `api/chat.ts` | AI duplicate analysis |

## 🔧 Customization

### Adding More Mock Data

Edit `api/mock-db.ts` to add:
- More sites, PORs, or line items
- Additional contracts
- Different contract statuses

### Adjusting Duplicate Detection

Modify `detectVariableCostDuplicates()` in `api/chat.ts` to:
- Change similarity threshold (currently 0.7)
- Use different AI models
- Add more sophisticated comparison logic

### Changing UI

Edit `client/components.tsx` to:
- Customize warning display
- Add acknowledgment form
- Modify styling

## 📚 Related Exercises

- `exercises/03-agents/03.01-tool-calling/` - Tool calling patterns
- `exercises/07-streaming/07.01-custom-data-parts/` - Custom data streaming
- `exercises/08-agents-and-workflows/08.01-workflow/` - Workflow patterns
- `exercises/09-advanced-patterns/09.01-guardrails/` - Request validation

## 🚧 Future Enhancements

- [ ] Add questionnaire system for acknowledgment
- [ ] Integrate Langfuse for monitoring
- [ ] Add export functionality for duplicate reports
- [ ] Support for bulk contract checking
- [ ] Configuration UI for duplicate rules

## 💡 Notes

- This is a **proof-of-concept** - production implementation would need:
  - Real database integration
  - Authentication/authorization
  - Error handling and retries
  - Rate limiting
  - Caching for performance
  - Proper logging and monitoring

- The AI duplicate detection now uses structured output (`generateObject`) with Zod schemas for reliable parsing

- Mock database functions simulate network delays with `setTimeout` for realism

