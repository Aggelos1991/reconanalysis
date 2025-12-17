import { DatabaseRecord, NormalizedRow } from '../types';

const DB_NAME = 'ReconRaptorDB';
const DB_VERSION = 2; // Bump version to ensure clean slate if needed
const STORE_NAME = 'records';

// --- IndexedDB Helpers ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Create store with 'id' as key
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const getRecords = async (): Promise<DatabaseRecord[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveRecords = async (newRecords: DatabaseRecord[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Add each record individually to handle bulk inserts
    newRecords.forEach(record => {
      store.put(record); // put() updates if exists, add if new
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const updateRecord = async (id: string, updates: Partial<DatabaseRecord>): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        const updated = { ...record, ...updates };
        store.put(updated);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const deleteRecord = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);

    // CRITICAL FIX: Wait for transaction completion, not just request success
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const clearDatabase = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    // CRITICAL FIX: Wait for transaction completion
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Convert reconciliation "Missing ERP" rows to DB records
export const convertToDbRecords = (rows: NormalizedRow[]): DatabaseRecord[] => {
  return rows.map(r => ({
    id: `DB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    invoice: r.invoice,
    amount: r.amount,
    date: r.date,
    vendorName: r.vendorName || "Unknown Vendor",
    entity: r.entity || "Unknown Entity",
    status: 'Incomplete',
    comments: '',
    addedAt: new Date().toISOString()
  }));
};