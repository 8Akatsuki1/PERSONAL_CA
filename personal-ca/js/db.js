// ============================================
// db.js — IndexedDB wrapper for Personal CA
// Single source of truth for all local data.
// ============================================

const DB_NAME = 'PersonalCA_DB';
const DB_VERSION = 2;

const STORES = {
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
  INCOME: 'income',
  SETTINGS: 'settings',
  AUTH: 'auth',
  SYNC_QUEUE: 'syncQueue',
  RECURRING: 'recurring',
  REMITTANCES: 'remittances'
};

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id', autoIncrement: true });
        expenseStore.createIndex('date', 'date', { unique: false });
        expenseStore.createIndex('category', 'category', { unique: false });
        expenseStore.createIndex('vendor', 'vendor', { unique: false });
        expenseStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
        expenseStore.createIndex('status', 'status', { unique: false });
        expenseStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        expenseStore.createIndex('lastModified', 'lastModified', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        const catStore = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id', autoIncrement: true });
        catStore.createIndex('name', 'name', { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.INCOME)) {
        const incomeStore = db.createObjectStore(STORES.INCOME, { keyPath: 'id', autoIncrement: true });
        incomeStore.createIndex('date', 'date', { unique: false });
        incomeStore.createIndex('source', 'source', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORES.AUTH)) {
        db.createObjectStore(STORES.AUTH, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('storeName', 'storeName', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.RECURRING)) {
        const recStore = db.createObjectStore(STORES.RECURRING, { keyPath: 'id', autoIncrement: true });
        recStore.createIndex('nextDueDate', 'nextDueDate', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.REMITTANCES)) {
        const remitStore = db.createObjectStore(STORES.REMITTANCES, { keyPath: 'id', autoIncrement: true });
        remitStore.createIndex('date', 'date', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

async function dbAdd(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    record.lastModified = Date.now();
    if (storeName === STORES.EXPENSES && !record.syncStatus) {
      record.syncStatus = 'pending';
    }
    const request = store.add(record);
    request.onsuccess = () => {
      if (window.PersonalCA_Utils) window.PersonalCA_Utils.notifyDataChanged(storeName);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

async function dbPut(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    record.lastModified = Date.now();
    if (storeName === STORES.EXPENSES) {
      record.syncStatus = 'pending';
    }
    const request = store.put(record);
    request.onsuccess = () => {
      if (window.PersonalCA_Utils) window.PersonalCA_Utils.notifyDataChanged(storeName);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

async function dbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => {
      if (window.PersonalCA_Utils) window.PersonalCA_Utils.notifyDataChanged(storeName);
      resolve(true);
    };
    request.onerror = () => reject(request.error);
  });
}

async function dbClearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function dbQueryByIndex(storeName, indexName, range) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(range);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

window.PersonalCA_DB = {
  STORES, openDB,
  add: dbAdd, put: dbPut, get: dbGet, getAll: dbGetAll,
  delete: dbDelete, clearStore: dbClearStore, queryByIndex: dbQueryByIndex
};
