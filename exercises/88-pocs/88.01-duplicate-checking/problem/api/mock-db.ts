// Mock database with sample contract and line item data

export type Site = {
  id: string;
  name: string;
};

export type POR = {
  id: string;
  name: string;
  projectCode: string;
};

export type LineItem = {
  id: string;
  name: string;
  type: 'fixed-cost' | 'variable-cost';
  details?: string; // Free-text details for variable-cost items
};

export type Contract = {
  id: string;
  contractNumber: string;
  siteId: string;
  porId: string;
  status: 'awarded' | 'pending' | 'cancelled';
  lineItems: Array<{
    lineItemId: string;
    quantity?: number;
    details?: string;
  }>;
  awardedDate: string;
};

export type AwardData = {
  siteId: string;
  porId: string;
  lineItems: Array<{
    lineItemId: string;
    quantity?: number;
    details?: string;
  }>;
};

// Mock data
export const MOCK_SITES: Site[] = [
  { id: 'site-001', name: 'Downtown Tower A' },
  { id: 'site-002', name: 'Suburban Office Complex' },
  { id: 'site-003', name: 'Airport Terminal' },
];

export const MOCK_PORS: POR[] = [
  {
    id: 'por-001',
    name: 'Fiber Infrastructure Upgrade',
    projectCode: 'FIBER-2025-Q1',
  },
  {
    id: 'por-002',
    name: 'Network Equipment Refresh',
    projectCode: 'NET-2025-Q1',
  },
  {
    id: 'por-003',
    name: '5G Tower Installation',
    projectCode: '5G-2025-Q1',
  },
];

export const MOCK_LINE_ITEMS: LineItem[] = [
  {
    id: 'line-001',
    name: 'Fiber Optic Cable Installation',
    type: 'variable-cost',
  },
  {
    id: 'line-002',
    name: 'Network Switch',
    type: 'fixed-cost',
  },
  {
    id: 'line-003',
    name: 'Tower Foundation',
    type: 'fixed-cost',
  },
  {
    id: 'line-004',
    name: 'Site Preparation',
    type: 'variable-cost',
  },
  {
    id: 'line-005',
    name: 'Equipment Rack',
    type: 'fixed-cost',
  },
];

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'contract-001',
    contractNumber: 'PO-2025-001',
    siteId: 'site-001',
    porId: 'por-001',
    status: 'awarded',
    lineItems: [
      {
        lineItemId: 'line-001',
        details:
          'Install fiber optic cable from main hub to building basement',
      },
      {
        lineItemId: 'line-002',
        quantity: 2,
      },
    ],
    awardedDate: '2025-01-15',
  },
  {
    id: 'contract-002',
    contractNumber: 'PO-2025-002',
    siteId: 'site-001',
    porId: 'por-001',
    status: 'awarded',
    lineItems: [
      {
        lineItemId: 'line-004',
        details: 'Prepare site for fiber installation - trenching and conduit',
      },
    ],
    awardedDate: '2025-01-20',
  },
  {
    id: 'contract-003',
    contractNumber: 'PO-2025-003',
    siteId: 'site-002',
    porId: 'por-002',
    status: 'awarded',
    lineItems: [
      {
        lineItemId: 'line-002',
        quantity: 5,
      },
      {
        lineItemId: 'line-005',
        quantity: 3,
      },
    ],
    awardedDate: '2025-02-01',
  },
  {
    id: 'contract-004',
    contractNumber: 'PO-2025-004',
    siteId: 'site-001',
    porId: 'por-001',
    status: 'cancelled', // Should be ignored
    lineItems: [
      {
        lineItemId: 'line-001',
        details: 'Cancelled contract',
      },
    ],
    awardedDate: '2025-01-10',
  },
];

// Mock database functions
export async function searchExistingContracts(params: {
  siteId: string;
  porId: string;
  lineItemIds: string[];
}): Promise<Contract[]> {
  // Simulate database query delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return MOCK_CONTRACTS.filter(
    (contract) =>
      contract.status === 'awarded' &&
      contract.siteId === params.siteId &&
      contract.porId === params.porId &&
      contract.lineItems.some((li) =>
        params.lineItemIds.includes(li.lineItemId),
      ),
  );
}

export async function getLineItemDetails(
  lineItemId: string,
): Promise<LineItem | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_LINE_ITEMS.find((li) => li.id === lineItemId);
}

export async function getContractDetails(
  contractId: string,
): Promise<Contract | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_CONTRACTS.find((c) => c.id === contractId);
}

export async function getSiteDetails(siteId: string): Promise<Site | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_SITES.find((s) => s.id === siteId);
}

export async function getPORDetails(porId: string): Promise<POR | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_PORS.find((p) => p.id === porId);
}

