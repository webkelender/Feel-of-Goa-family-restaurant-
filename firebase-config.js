// ── FIREBASE CONFIG — Feel of Goa Family Restaurant ──────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeFirestore, collection, addDoc, onSnapshot,
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
  // Force long-polling instead of streaming — mobile networks/Data Saver
  // often silently break the default streaming connection. Long-polling
  // uses plain HTTP requests instead, same as the writes that already work.
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
  return onSnapshot(
    query(ordersCol),
    (snapshot) => {
      const orders = [];
      snapshot.forEach((docSnap) => orders.push({ ...docSnap.data(), docId: docSnap.id }));
      orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(orders, null);
    },
    (error) => {
      console.error("fbListenOrders error:", error);
      callback([], error);
    }
  );
};

window.fbUpdateOrderStatus = function(docId, status) {
  if (!db) return Promise.reject(new Error("Firebase not initialized"));
  return updateDoc(doc(db, "orders", docId), { status });
};

window.fbDeleteOrder = function(docId) {
  if (!db) return Promise.reject(new Error("Firebase not initialized"));
  return deleteDoc(doc(db, "orders", docId));
};
