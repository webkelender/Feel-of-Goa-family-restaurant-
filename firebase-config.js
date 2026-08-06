// ── FIREBASE CONFIG — Feel of Goa Family Restaurant ──────────────────
const PROJECT_ID = "feel-of-goa-restaurant";
const API_KEY = "AIzaSyATcb9J3gAyfHxAPuOy5yTec8ZUM7pbvWg";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toFirestoreValue) } };
  }
  if (typeof v === "object") {
    return { mapValue: { fields: toFirestoreFields(v) } };
  }
  return { stringValue: String(v) };
}
function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}
function fromFirestoreValue(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in v) return fromFirestoreFields(v.mapValue.fields || {});
  return null;
}
function fromFirestoreFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {})) obj[k] = fromFirestoreValue(v);
  return obj;
}
function docIdFromName(name) {
  return name.split("/").pop();
}

window.fbAddOrder = async function (order) {
  const body = { fields: toFirestoreFields({ ...order, createdAt: new Date().toISOString() }) };
  const res = await fetch(`${BASE}/orders?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to add order (HTTP " + res.status + ")");
  return res.json();
};

window.fbListenOrders = function (callback) {
  let stopped = false;
  const POLL_MS = 5000;
  async function poll() {
    if (stopped) return;
    if (!document.hidden) {
      try {
        const res = await fetch(`${BASE}/orders?key=${API_KEY}`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const orders = (data.documents || []).map((d) => ({
          ...fromFirestoreFields(d.fields),
          docId: docIdFromName(d.name),
        }));
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

window.fbUpdateOrderStatus = async function (docId, status) {
  const body = { fields: { status: { stringValue: status } } };
  const res = await fetch(`${BASE}/orders/${docId}?updateMask.fieldPaths=status&key=${API_KEY}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update status (HTTP " + res.status + ")");
  return res.json();
};

window.fbDeleteOrder = async function (docId) {
  const res = await fetch(`${BASE}/orders/${docId}?key=${API_KEY}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete order (HTTP " + res.status + ")");
  return true;
};

// Mark ready LAST — only now that every window.fb* function above
// actually exists, so anything reacting to this event can call them safely.
window.fbReady = true;
window.dispatchEvent(new Event("firebase-ready"));
