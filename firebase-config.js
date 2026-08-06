// ── FIREBASE CONFIG — Feel of Goa Family Restaurant ──────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeFirestore, collection, addDoc, getDocs,
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
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false
  });
  ordersCol = collection(db, "orders");
  markReady();
} catch (err) {
  markError(err);
}

window.fbAddOrder = function(order) {
  if (!ordersCol) return Promise.reject(new Error("Firebase not initialized"));
  return addDoc(ordersCol, { ...order, createdAt: serverTimestamp() });
};

window.fbListenOrders = function(callback) {
  if (!ordersCol) {
    callback([], new Error("Firebase not initialized"));
    return () => {};
  }
  let stopped = false;
  const POLL_MS = 5000;
  async function poll() {
    if (stopped) return;
    if (!document.hidden) {
      try {
        const snapshot = await getDocs(query(ordersCol));
        const orders = [];
        snapshot.forEach((docSnap) => orders.push({ ...docSnap.data(), docId: docSnap.id }));
        orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(orders, null);
      } catch (error) {
        console.error("fbListenOrders poll error:", error);
        callback([], error);
      }
    }
    if (!stopped) setTimeout(poll, POLL_MS);
  }
  poll();
  return () => { stopped = true; };
};

window.fbUpdateOrderStatus = function(docId, status) {
  if (!db) return Promise.reject(new Error("Firebase not initialized"));
  return updateDoc(doc(db, "orders", docId), { status });
};

window.fbDeleteOrder = function(docId) {
  if (!db) return Promise.reject(new Error("Firebase not initialized"));
  return deleteDoc(doc(db, "orders", docId));
};
