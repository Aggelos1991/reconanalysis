import * as XLSX from 'xlsx';
import { NormalizedRow, MatchResult, ReconciliationState, RawRow } from '../types';
import { v4 as uuidv4 } from 'uuid'; // In a real app use uuid, here we simulate

// --- Helpers ---

const cleanInvoiceCode = (v: string): string => {
  if (!v) return "";
  let s = String(v).trim().toLowerCase();
  
  // Basic cleaning regex similar to python script
  s = s.replace(/^(αρ|τιμ|pf|ab|inv|tim|cn|ar|pa|πφ|πα|apo|ref|doc|num|no|apd|vs)\W*/g, "");
  s = s.replace(/20\d{2}/g, ""); // Remove years like 2023, 2024
  s = s.replace(/[^a-z0-9]/g, ""); // Keep alphanum
  s = s.replace(/^0+/, ""); // Lstrip 0
  
  return s || "0";
};

const normalizeNumber = (v: any): number => {
  if (v === null || v === undefined || String(v).trim() === "") return 0.0;
  if (typeof v === 'number') return v;
  
  let s = String(v).trim();
  
  // Remove currency symbols and other non-numeric chars except for , . -
  s = s.replace(/[^\d,.-]/g, '');

  // Handle 1.000,00 vs 1,000.00 logic simplistically
  if (s.includes(',') && s.includes('.')) {
    if (s.indexOf(',') > s.indexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  
  const f = parseFloat(s);
  return isNaN(f) ? 0.0 : f;
};

const normalizeDate = (v: any): string => {
  if (!v) return "";
  // Excel serial date handling
  if (typeof v === 'number') {
    const date = XLSX.SSF.parse_date_code(v);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  // Basic string parsing
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return String(v);
};

const calculateLevenshtein = (a: string, b: string): number => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const fuzzyRatio = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = calculateLevenshtein(a, b);
  return 1.0 - (dist / maxLen);
};

// --- Main Processing ---

const identifyColumns = (row: any) => {
  const keys = Object.keys(row).map(k => k.toLowerCase());
  
  const findKey = (candidates: string[]) => {
    return Object.keys(row).find(k => candidates.some(c => k.toLowerCase().includes(c)));
  };

  const invoiceCol = findKey(["invoice", "inv no", "factura", "doc", "ref", "num"]);
  const debitCol = findKey(["debit", "debe", "amount", "valor", "total"]);
  const creditCol = findKey(["credit", "haber", "abono"]);
  const dateCol = findKey(["date", "fecha", "issue"]);
  const reasonCol = findKey(["reason", "desc", "motivo"]);
  
  // FIXED: Removed generic "company" from Entity to avoid confusing it with Vendor Name
  // Added "entithy" for typo handling, and strict business unit terms
  const entityCol = findKey(["entity", "entithy", "entidad", "legal", "society", "sociedad", "business unit", "bu_"]);
  
  // FIXED: Added "company" and "partner" to Vendor candidates
  const vendorCol = findKey(["vendor", "supplier", "payee", "proveedor", "name", "company", "partner", "third party"]);

  return { invoiceCol, debitCol, creditCol, dateCol, reasonCol, entityCol, vendorCol };
};

export const parseAndNormalize = (data: any[], source: 'ERP' | 'VENDOR'): NormalizedRow[] => {
  if (data.length === 0) return [];
  const cols = identifyColumns(data[0]);
  
  return data.map((row, idx) => {
    const invRaw = cols.invoiceCol ? row[cols.invoiceCol] : `UNKNOWN-${idx}`;
    const debit = cols.debitCol ? normalizeNumber(row[cols.debitCol]) : 0;
    const credit = cols.creditCol ? normalizeNumber(row[cols.creditCol]) : 0;
    const dateRaw = cols.dateCol ? row[cols.dateCol] : "";
    const reasonRaw = cols.reasonCol ? String(row[cols.reasonCol]).toLowerCase() : "";
    const entityRaw = cols.entityCol ? String(row[cols.entityCol]) : "";
    const vendorRaw = cols.vendorCol ? String(row[cols.vendorCol]) : "";

    let type: 'INV' | 'CN' | 'IGNORE' = 'INV';
    const amount = Math.abs(debit - credit);

    // Classification Logic
    if (reasonRaw.includes('payment') || reasonRaw.includes('transfer') || reasonRaw.includes('πληρωμ')) {
      type = 'IGNORE';
    } else if (reasonRaw.includes('credit') || reasonRaw.includes('cn') || credit > debit) {
      type = 'CN';
    }

    // In a real scenario, we might ignore IGNORE types, but let's keep them filtered later or mark here
    
    return {
      id: `${source}-${idx}-${Math.random()}`,
      invoice: String(invRaw),
      amount: parseFloat(amount.toFixed(2)),
      date: normalizeDate(dateRaw),
      originalRow: row,
      type,
      normalizedCode: cleanInvoiceCode(String(invRaw)),
      source,
      entity: entityRaw.trim(),
      vendorName: vendorRaw.trim()
    };
  }).filter(r => r.type !== 'IGNORE' && r.amount > 0);
};

// --- Aggregation / Netting Logic ---
const consolidateRows = (rows: NormalizedRow[]): NormalizedRow[] => {
  const groups = new Map<string, NormalizedRow[]>();

  // 1. Group by normalized invoice code
  rows.forEach(r => {
    // Skip very short or empty codes to avoid aggressive clumping of bad data
    if (r.normalizedCode.length < 2) {
      // Treat as unique group
      const uniqueKey = `_unique_${r.id}`;
      groups.set(uniqueKey, [r]);
    } else {
      if (!groups.has(r.normalizedCode)) groups.set(r.normalizedCode, []);
      groups.get(r.normalizedCode)!.push(r);
    }
  });

  const consolidated: NormalizedRow[] = [];

  groups.forEach((group, key) => {
    // Optimization: If only one row, no math needed
    if (group.length === 1) {
      consolidated.push(group[0]);
      return;
    }

    // 2. Sum signed amounts
    let net = 0;
    group.forEach(r => {
      // INV adds, CN subtracts
      const sign = r.type === 'CN' ? -1 : 1;
      net += r.amount * sign;
    });

    // 3. Filter out zero balance
    if (Math.abs(net) < 0.01) {
      // Net is zero, remove entirely
      return;
    }

    // 4. Create aggregated row
    // Determine new type based on net sign
    const newType = net < 0 ? 'CN' : 'INV';
    const absNet = parseFloat(Math.abs(net).toFixed(2));

    // Pick a representative row for metadata (prefer one that matches the resulting type)
    const rep = group.find(r => r.type === newType) || group[0];

    consolidated.push({
      ...rep, // Copy metadata from representative
      amount: absNet,
      type: newType,
      id: `agg-${key}-${uuidv4()}`, // New ID for the aggregated row
    });
  });

  return consolidated;
};

export const runReconciliation = (erpDataRaw: NormalizedRow[], vendorDataRaw: NormalizedRow[]): ReconciliationState => {
  // --- Step 0: Consolidate / Net Data ---
  const erpData = consolidateRows(erpDataRaw);
  const vendorData = consolidateRows(vendorDataRaw);

  const matches: MatchResult[] = [];
  const matchedErpIds = new Set<string>();
  const matchedVendorIds = new Set<string>();

  // --- Tier 1: Exact Match ---
  erpData.forEach(e => {
    if (matchedErpIds.has(e.id)) return;
    
    // Find matching in vendor
    const vMatch = vendorData.find(v => 
      !matchedVendorIds.has(v.id) && 
      v.invoice.trim() === e.invoice.trim()
    );

    if (vMatch) {
      const diff = Math.abs(e.amount - vMatch.amount);
      matches.push({
        erpId: e.id, vendorId: vMatch.id,
        erpInvoice: e.invoice, vendorInvoice: vMatch.invoice,
        erpAmount: e.amount, vendorAmount: vMatch.amount,
        difference: parseFloat(diff.toFixed(2)),
        status: diff <= 0.05 ? 'Perfect Match' : 'Difference Match'
      });
      matchedErpIds.add(e.id);
      matchedVendorIds.add(vMatch.id);
    }
  });

  // --- Tier 2: Fuzzy + Small Diff ---
  erpData.forEach(e => {
    if (matchedErpIds.has(e.id)) return;

    for (const v of vendorData) {
      if (matchedVendorIds.has(v.id)) continue;

      const diff = Math.abs(e.amount - v.amount);
      const similarity = fuzzyRatio(e.normalizedCode, v.normalizedCode);

      // Diff <= 1.00 AND Similarity >= 0.90
      if (diff <= 1.00 && similarity >= 0.90) {
        matches.push({
          erpId: e.id, vendorId: v.id,
          erpInvoice: e.invoice, vendorInvoice: v.invoice,
          erpAmount: e.amount, vendorAmount: v.amount,
          difference: parseFloat(diff.toFixed(2)),
          status: 'Tier-2',
          similarity
        });
        matchedErpIds.add(e.id);
        matchedVendorIds.add(v.id);
        break; // One match per ERP line
      }
    }
  });

  // --- Tier 3: Same Date + Strong Fuzzy ---
  erpData.forEach(e => {
    if (matchedErpIds.has(e.id)) return;
    if (!e.date) return;

    for (const v of vendorData) {
      if (matchedVendorIds.has(v.id)) continue;
      if (!v.date) continue;

      if (e.date === v.date) {
        const similarity = fuzzyRatio(e.normalizedCode, v.normalizedCode);
        if (similarity >= 0.75) {
          const diff = Math.abs(e.amount - v.amount);
           matches.push({
            erpId: e.id, vendorId: v.id,
            erpInvoice: e.invoice, vendorInvoice: v.invoice,
            erpAmount: e.amount, vendorAmount: v.amount,
            difference: parseFloat(diff.toFixed(2)),
            status: 'Tier-3',
            similarity
          });
          matchedErpIds.add(e.id);
          matchedVendorIds.add(v.id);
          break;
        }
      }
    }
  });

  // --- Compile Results ---
  const missingErp = erpData.filter(e => !matchedErpIds.has(e.id));
  const missingVendor = vendorData.filter(v => !matchedVendorIds.has(v.id));

  const stats = {
    perfectCount: matches.filter(m => m.status === 'Perfect Match').length,
    perfectSum: matches.filter(m => m.status === 'Perfect Match').reduce((acc, m) => acc + m.difference, 0),
    diffCount: matches.filter(m => m.status === 'Difference Match').length,
    diffSum: matches.filter(m => m.status === 'Difference Match').reduce((acc, m) => acc + m.difference, 0),
    tier2Count: matches.filter(m => m.status === 'Tier-2').length,
    tier2Sum: matches.filter(m => m.status === 'Tier-2').reduce((acc, m) => acc + m.difference, 0),
    tier3Count: matches.filter(m => m.status === 'Tier-3').length,
    tier3Sum: matches.filter(m => m.status === 'Tier-3').reduce((acc, m) => acc + m.difference, 0),
    missingErpCount: missingErp.length,
    missingErpSum: missingErp.reduce((acc, i) => acc + i.amount, 0),
    missingVendorCount: missingVendor.length,
    missingVendorSum: missingVendor.reduce((acc, i) => acc + i.amount, 0),
  };

  return { matches, missingErp, missingVendor, stats };
};