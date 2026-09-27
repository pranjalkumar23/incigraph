import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm";

const INTENT_EXAMPLES = {
  sellers: ["who sells this", "who supplies this chemical", "sellers of this ingredient", "suppliers for this", "where can I buy this chemical"],
  brands: ["which brands use this", "who uses this chemical", "brands using this ingredient", "what brands contain this"],
  products: ["products that use this", "products containing this ingredient", "what products have this", "list of products with this", "items made with this"],
  chemicals: ["ingredients used by this brand", "chemicals in this product", "what chemicals does this brand use", "what is this made of"],
  outreach: ["linkedin outreach contact for this", "contact info for this brand", "how do I reach this supplier", "who do I contact at this company"],
  brand: ["which brand makes this product", "who makes this product", "brand behind this product", "who manufactures this"],
  details: ["tell me more about this", "give me details on this", "information about this", "what do you know about this", "summarize this"],
  reset: ["clear the graph", "reset everything", "start over", "clear the screen", "empty the canvas"],
  show: ["show this", "add this to the graph", "look up this", "display this node", "find this"],
};

let extractor = null;
let exampleEmbeddings = null;
let initPromise = null;

async function embed(text) {
  const out = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}

async function init() {
  extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  const flat = [];
  for (const [relation, examples] of Object.entries(INTENT_EXAMPLES)) {
    for (const text of examples) {
      flat.push({ relation, vec: await embed(text) });
    }
  }
  exampleEmbeddings = flat;
}

function ensureInit() {
  if (!initPromise) {
    initPromise = init().catch((err) => {
      console.warn("NLU init failed, semantic fallback disabled", err);
      exampleEmbeddings = null;
      throw err;
    });
  }
  return initPromise;
}

function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

async function classify(text, timeoutMs = 4000) {
  try {
    await Promise.race([ensureInit(), new Promise((_, reject) => setTimeout(() => reject(new Error("nlu-timeout")), timeoutMs))]);
  } catch {
    return null;
  }
  if (!exampleEmbeddings) return null;
  const vec = await embed(text);
  let best = null;
  for (const ex of exampleEmbeddings) {
    const sim = cosine(vec, ex.vec);
    if (!best || sim > best.sim) best = { relation: ex.relation, sim };
  }
  return best;
}

ensureInit();

window.NLU = { classify };
