const STORE_KEY = "state.json";

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function normalizeState(payload) {
  const classes = Array.isArray(payload?.classes) ? payload.classes : [];
  const exams = Array.isArray(payload?.exams) ? payload.exams : [];
  return { classes, exams };
}

async function readState(env) {
  const data = await env.SCORE_STATE.get(STORE_KEY, "json");
  return normalizeState(data || {});
}

async function writeState(env, payload) {
  const state = normalizeState(payload);
  await env.SCORE_STATE.put(STORE_KEY, JSON.stringify(state));
  return state;
}

async function handleState(request, env) {
  try {
    if (request.method === "GET") return json(await readState(env));
    if (request.method === "PUT") return json(await writeState(env, await request.json()));
    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return json({ error: message }, 400);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/state") return handleState(request, env);
    return env.ASSETS.fetch(request);
  },
};
