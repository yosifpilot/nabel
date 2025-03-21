
import { openDB } from 'idb';

const DB_NAME = 'restaurantDB';
const DB_VERSION = 1;

let db = null;

export async function initDB() {
  if (!db) {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('tables')) {
          db.createObjectStore('tables', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date');
        }
      }
    });
  }
  return db;
}

// Products
export async function getProducts() {
  const db = await initDB();
  return db.getAll('products');
}

export async function addProduct(product) {
  const db = await initDB();
  return db.add('products', product);
}

export async function updateProduct(product) {
  const db = await initDB();
  return db.put('products', product);
}

export async function deleteProduct(id) {
  const db = await initDB();
  return db.delete('products', id);
}

// Categories
export async function getCategories() {
  const db = await initDB();
  const categories = await db.getAll('categories');
  return categories.map(cat => cat.name);
}

export async function addCategory(category) {
  const db = await initDB();
  return db.add('categories', category);
}

export async function updateCategory(oldName, newName) {
  const db = await initDB();
  const categories = await db.getAll('categories');
  const category = categories.find(c => c.name === oldName);
  if (category) {
    category.name = newName;
    return db.put('categories', category);
  }
  return null;
}

export async function deleteCategory(name) {
  const db = await initDB();
  const categories = await db.getAll('categories');
  const category = categories.find(c => c.name === name);
  if (category) {
    return db.delete('categories', category.id);
  }
  return null;
}

// Tables
export async function getTables() {
  const db = await initDB();
  return db.getAll('tables');
}

export async function updateTable(table) {
  const db = await initDB();
  return db.put('tables', table);
}

// Transactions
export async function getTransactions() {
  const db = await initDB();
  return db.getAll('transactions');
}

export async function addTransaction(transaction) {
  const db = await initDB();
  transaction.date = new Date().toISOString();
  return db.add('transactions', transaction);
}

// Export data
export async function exportData() {
  const data = {
    products: await getProducts(),
    categories: await getCategories(),
    tables: await getTables(),
    transactions: await getTransactions()
  };
  return data;
}

// Import data
export async function importData(data) {
  const db = await initDB();
  const tx = db.transaction(['products', 'categories', 'tables', 'transactions'], 'readwrite');
  
  await Promise.all([
    tx.objectStore('products').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('tables').clear(),
    tx.objectStore('transactions').clear()
  ]);

  await Promise.all([
    ...data.products.map(p => tx.objectStore('products').add(p)),
    ...data.categories.map(c => tx.objectStore('categories').add(c)),
    ...data.tables.map(t => tx.objectStore('tables').add(t)),
    ...data.transactions.map(t => tx.objectStore('transactions').add(t))
  ]);

  await tx.done;
}

// User management
export function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser'));
}

export async function login(username, password) {
  if (username && password) {
    localStorage.setItem('currentUser', JSON.stringify({ username }));
    return true;
  }
  throw new Error('بيانات غير صحيحة');
}

export async function logout() {
  localStorage.removeItem('currentUser');
}

export async function clearDatabase() {
  const db = await initDB();
  await db.clear('products');
  await db.clear('categories');
  await db.clear('tables');
  await db.clear('transactions');
}

export async function changePassword(currentPassword, newPassword) {
  // Implement password change logic here
  return true;
}

export function closeConnection() {
  db = null;
}

export function deleteDatabase() {
  return window.indexedDB.deleteDatabase(DB_NAME);
}

export function toggleSync(enabled) {
  localStorage.setItem('syncEnabled', enabled);
}

export function toggleAutoSync(enabled) {
  localStorage.setItem('autoSyncEnabled', enabled);
}

export const syncEnabled = localStorage.getItem('syncEnabled') === 'true';
