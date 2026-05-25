import { getDeployStore, getStore } from "@netlify/blobs";

const storeName = "class-score-state";
const blobKey = "state.json";

function getBlobStore() {
  const context = globalThis.Netlify?.context?.deploy?.context;
  return context === "production" ? getStore(storeName, { consistency: "strong" }) : getDeployStore(storeName);
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeState(payload) {
  const classes = Array.isArray(payload?.classes) ? payload.classes : [];
  const exams = Array.isArray(payload?.exams) ? payload.exams : [];
  return { classes, exams };
}

async function readState() {
  const store = getBlobStore();
  return normalizeState((await store.get(blobKey, { type: "json" })) || {});
}

async function writeState(payload) {
  const store = getBlobStore();
  const state = normalizeState(payload);
  await store.setJSON(blobKey, state);
  return state;
}

export default async (req) => {
  try {
    if (req.method === "GET") return json(await readState());
    if (req.method === "PUT") return json(await writeState(await req.json()));
    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return json({ error: message }, 400);
  }
};

export const config = {
  path: "/api/state",
};
