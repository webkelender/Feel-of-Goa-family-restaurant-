// ── FIREBASE CONFIG — Feel of Goa Family Restaurant ──────────────────
// This file is loaded as a <script type="module"> from menu.html, admin.html, chef.html.
// It exposes window.fb* functions and fires "firebase-ready" / "firebase-error" events.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyATcb9J3gAyfHxAPuOy5yTec8ZUM7pbvWg",
  authDomain: "feel-of-goa-restaurant.firebaseapp.com",
  projectId: "feel-of-goa-restaurant",
  storageBucket: "feel-of-goa-restaurant.firebasestorage.app",
  messagingSenderId: "352840727097",
  appId: "1:352840727097:web:103f688735d607f726abe8"
};

let db = null;
let ordersCol = null;

function markReady() {
  window.fbReady = true;
  window.dispatchEvent(new Event("firebase-ready"));
}

function markError(err) {
  console.error("Firebase init error:", err);
  window.fbError = err;
  window.dispatchEvent(new CustomEvent("firebase-error", { detail: err }));
}

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  ordersCol = collection(db, "orders");
  markReady();
} catch (err) {
  markError(err);
}

// ── Add a new order (called from menu.html) ──────────────────────────
window.fbAddOrder = function(order) {
  if (!ordersCol) return Promise.reject(new Error("Firebase not initialized"));
  return addDoc(ordersCol, {
    ...order,
    createdAt: serverTimestamp()
  });
};

// ── Listen live for all orders (called from admin.html / chef.html) ──
// callback(orders, error?) — orders is [] on error, error is the Firestore error object
window.fbListenOrders = function(callback) {
  if (!ordersCol) {
    callback([], new Error("Firebase not initialized"));
    return () => {};
  }
  let q;
  try {
    q = query(ordersCol);
  } catch (e) {
    // If index/orderBy fails for any reason, fall back to unordered query
    q = ordersCol;
  }
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = [];
      snapshot.forEach((docSnap) => {
        orders.push({ ...docSnap.data(), docId: docSnap.id });
      });
      // Client-side safety sort in case server-side orderBy wasn't applied
      orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(orders, null);
    },
    (error) => {
      console.error("fbListenOrders error:", error);
      callback([], error);
    }
  );
};

// ── Update an order's status (called from admin.html / chef.html) ────
window.fbUpdateOrderStatus = function(docId, status) {
  if (!db) return Promise.reject(new Error("Firebase not initialized"));
  return updateDoc(doc(db, "orders", docId), { status });
};

// ── Delete an order (used by "Clear Served") ──────────────────────────
window.fbDeleteOrder = function(docId) {
  if (!db) return Promise.reject(new Error("Firebase not initialized"));
  return deleteDoc(doc(db, "orders", docId));
};

