export interface RawRow {
  [key: string]: any;
}

export interface NormalizedRow {
  id: string; // unique internal ID
  invoice: string;
  amount: number;
  date: string;
  originalRow: RawRow;
  type: 'INV' | 'CN' | 'IGNORE';
  normalizedCode: string;
  source: 'ERP' | 'VENDOR';
  entity: string;      // Added field
  vendorName: string;  // Added field
}

export interface MatchResult {
  erpId: string;
  vendorId: string;
  erpInvoice: string;
  vendorInvoice: string;
  erpAmount: number;
  vendorAmount: number;
  difference: number;
  status: 'Perfect Match' | 'Difference Match' | 'Tier-2' | 'Tier-3';
  similarity?: number;
}

export interface ReconciliationState {
  matches: MatchResult[];
  missingErp: NormalizedRow[];
  missingVendor: NormalizedRow[];
  stats: {
    perfectCount: number;
    perfectSum: number;
    diffCount: number;
    diffSum: number;
    tier2Count: number;
    tier2Sum: number;
    tier3Count: number;
    tier3Sum: number;
    missingErpCount: number;
    missingErpSum: number;
    missingVendorCount: number;
    missingVendorSum: number;
  };
}

export interface DatabaseRecord {
  id: string;
  invoice: string;
  amount: number;
  date: string;
  vendorName: string;
  entity: string;      // Added field
  status: 'Incomplete' | 'Complete';
  comments: string;
  addedAt: string;
}