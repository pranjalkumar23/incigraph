const RESET_PATTERN = /^(?:reset(?:\s+the)?(?:\s+graph)?|clear(?:\s+the)?\s+graph|start over)$/i;
const DETAILS_PATTERN = /^(?:details?\s+(?:about|of|on)|tell me about|info(?:rmation)?\s+(?:about|on))\s+(.+)$/i;

const FILLER_PREFIX = /^(?:please|can you|could you|i want to|i want|i would like to|show me|give me|find me|get me|list me|list the|list|show|find|get|display|what are the|what are|what is the|what is)\s+/i;

function stripFillers(s) {
  let prev = s;
  for (let i = 0; i < 4; i++) {
    const next = prev.replace(FILLER_PREFIX, "");
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

const INTENT_PATTERNS = [
  { relation: "sellers", re: /^(?:who\s+(?:sells|supplies)|sellers?\s+(?:of|for)|suppliers?\s+(?:of|for))\s+(.+)$/i },
  { relation: "brands", re: /^(?:who\s+uses|which\s+brands?\s+use|brands?\s+(?:using|with|that\s+use))\s+(.+)$/i },
  { relation: "products", re: /^products?\s+(?:using|with|containing|that\s+use|that\s+contain|of|by|from)\s+(.+)$/i },
  { relation: "chemicals", re: /^(?:ingredients?|chemicals?)\s+(?:of|in|used\s+by|for)\s+(.+)$/i },
  { relation: "outreach", re: /^(?:linkedin\s+outreach|linkedin|outreach|contacts?)\s+(?:for|of)\s+(.+)$/i },
  { relation: "brand", re: /^(?:brand|maker)\s+(?:of|for|behind)\s+(.+)$/i },
  { relation: null, re: /^show\s+(.+)$/i },
];

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const chatMessages = document.getElementById("chatMessages");

function addChatMessage(role, html) {
  if (typeof showDrawerView === "function" && document.getElementById("detailsPanelBody").style.display !== "none") {
    showDrawerView("chat");
  }
  const row = document.createElement("div");
  row.className = `chat-bubble-row ${role}`;
  const avatar = document.createElement("div");
  avatar.className = `chat-avatar ${role}`;
  avatar.innerHTML = role === "assistant" ? '<i class="ti ti-sparkles"></i>' : '<i class="ti ti-user"></i>';
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.innerHTML = html;
  row.appendChild(avatar);
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function applyEntityRelation(best, relation, { viaSemantic } = {}) {
  const wasEmpty = nodesDS.length === 0;
  const nid = ensureNode(best.type, best.id, best.name);
  const suffix = viaSemantic ? ` <span class="tag">interpreted from phrasing</span>` : "";

  if (relation) {
    const rel = EXPANDERS[best.type] && EXPANDERS[best.type][relation];
    if (rel) {
      rel.run(nid, best.id);
      markExpanded(nid, relation);
      focusOn(nid);
      addChatMessage("assistant", `${rel.label} for <strong>${escapeHtml(best.name)}</strong>.${suffix}`);
    } else {
      addChatMessage("assistant", `${TYPE_LABEL[best.type]} "${escapeHtml(best.name)}" doesn't support that relationship. Hover it in the graph to see what's available.`);
    }
  } else {
    addChatMessage("assistant", `Added <strong>${escapeHtml(best.name)}</strong> (${TYPE_LABEL[best.type]}) to the graph.${suffix} Hover it to expand.`);
  }

  if (wasEmpty) {
    network.fit({ animation: false });
  } else {
    settleLayout(nid);
  }
}

function showEntityDetails(best, { viaSemantic } = {}) {
  const suffix = viaSemantic ? ` <span class="tag">interpreted from phrasing</span>` : "";
  addChatMessage("assistant", `Showing details for <strong>${escapeHtml(best.name)}</strong> in the side panel.${suffix}`);
  renderEntityDetailsStandalone(best.type, best.id, best.name);
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "at", "for", "with", "this", "that", "is", "are", "do", "does",
  "and", "or", "what", "who", "how", "where", "when", "why", "which", "can", "could", "would", "should",
  "i", "me", "my", "you", "your", "we", "us", "our", "it", "its", "be", "been", "being",
  "please", "tell", "show", "list", "find", "get", "give", "display", "need", "want", "like", "help",
  "more", "info", "information", "about", "details", "detail", "buy", "have", "has", "had", "just",
  "also", "really", "some", "any", "all", "there", "here", "out", "up", "down",
]);

function findEntityWindow(text) {
  const words = text.split(/\s+/).filter(Boolean);
  for (let len = words.length; len >= 1; len--) {
    for (let start = 0; start + len <= words.length; start++) {
      const windowWords = words.slice(start, start + len);
      const candidate = windowWords.join(" ");
      if (candidate.length < 3) continue;
      if (windowWords.every((w) => STOPWORDS.has(w))) continue;
      const found = search(candidate, "all");
      if (found.length > 0) return found[0];
    }
  }
  return null;
}

const SEMANTIC_BUCKET_TO_RELATION = { sellers: "sellers", brands: "brands", products: "products", chemicals: "chemicals", outreach: "outreach", brand: "brand", show: null };
const RESET_CONFIDENCE = 0.75;
const MIN_CONFIDENCE = 0.15;

async function trySemanticFallback(normalized) {
  if (!window.NLU || typeof window.NLU.classify !== "function") return false;
  const best = await window.NLU.classify(normalized).catch(() => null);
  if (!best || best.sim < MIN_CONFIDENCE) return false;

  // Reset has no entity to ground it, so it needs a much closer phrasing match
  // than relation/details intents, which are validated against a real known entity below.
  if (best.relation === "reset" && best.sim >= RESET_CONFIDENCE) {
    resetGraph();
    addChatMessage("assistant", "Cleared the graph.");
    return true;
  }

  const entityMatch = findEntityWindow(normalized);
  if (!entityMatch) return false;

  if (best.relation === "details") {
    showEntityDetails(entityMatch, { viaSemantic: true });
    return true;
  }

  const relation = SEMANTIC_BUCKET_TO_RELATION[best.relation] ?? null;
  const relationAvailable = relation && EXPANDERS[entityMatch.type] && EXPANDERS[entityMatch.type][relation];
  applyEntityRelation(entityMatch, relationAvailable ? relation : null, { viaSemantic: true });
  return true;
}

async function handleQuery(rawText) {
  const text = rawText.trim();
  if (!text) return;
  addChatMessage("user", escapeHtml(text));

  const normalized = text.toLowerCase().replace(/[?.!]+$/, "").trim();
  const stripped = stripFillers(normalized);

  if (RESET_PATTERN.test(stripped)) {
    resetGraph();
    addChatMessage("assistant", "Cleared the graph.");
    return;
  }

  const detailsMatch = stripped.match(DETAILS_PATTERN);
  if (detailsMatch) {
    const entityText = detailsMatch[1].trim();
    const results = search(entityText, "all");
    if (results.length > 0) {
      showEntityDetails(results[0]);
      return;
    }
  }

  let relation = null;
  let entityText = stripped;
  for (const intent of INTENT_PATTERNS) {
    const m = stripped.match(intent.re);
    if (m) {
      relation = intent.relation;
      entityText = m[1].trim();
      break;
    }
  }

  const results = search(entityText, "all");
  if (results.length > 0) {
    applyEntityRelation(results[0], relation);
    return;
  }

  const handledSemantically = await trySemanticFallback(normalized);
  if (!handledSemantically) {
    addChatMessage("assistant", `Couldn't find anything matching "${escapeHtml(entityText)}".`);
  }
}

function renderEntityDetailsStandalone(type, refId, name) {
  const style = GROUP_STYLE[type];
  const fakeNode = { nodeType: type, refId, rawLabel: name };
  const relations = EXPANDERS[type] || {};
  const buttons = Object.entries(relations)
    .filter(([, rel]) => !rel.available || rel.available(refId))
    .map(([relKey, rel]) => `<button class="detail-action-btn" data-rel="${relKey}">${rel.label}</button>`)
    .join("");

  const detailsPanelBody = document.getElementById("detailsPanelBody");
  detailsPanelBody.innerHTML = `
    <div class="detail-card">
      <div class="detail-card-header" style="background:${style.bg};border-color:${style.border};">
        <span class="detail-card-icon">${style.icon}</span>
        <div>
          <div class="detail-card-title">${escapeHtml(name)}</div>
          <div class="detail-card-type">${TYPE_LABEL[type] || type}</div>
        </div>
      </div>
      <div class="detail-card-body">${detailLine(fakeNode)}</div>
      ${buttons ? `<div class="detail-card-actions">${buttons}</div>` : ""}
    </div>
  `;
  detailsPanelBody.querySelectorAll("button[data-rel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nid = ensureNode(type, refId, name);
      const wasEmpty = nodesDS.length === 1;
      relations[btn.dataset.rel].run(nid, refId);
      markExpanded(nid, btn.dataset.rel);
      focusOn(nid);
      switchView("graph");
      renderNodeDetails(nid);
      if (wasEmpty) {
        network.fit({ animation: false });
      } else {
        settleLayout(nid);
      }
    });
  });
  showDrawerView("details");
}

const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

chatSend.addEventListener("click", () => {
  handleQuery(chatInput.value);
  chatInput.value = "";
});
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleQuery(chatInput.value);
    chatInput.value = "";
  }
});

addChatMessage(
  "assistant",
  `Try things like: <span class="tag">"show niacinamide"</span> <span class="tag">"brands using niacinamide"</span> <span class="tag">"sellers of niacinamide"</span> <span class="tag">"products of Dabur Red"</span> <span class="tag">"details about Dabur Red"</span> <span class="tag">"linkedin outreach for Dabur Red"</span> <span class="tag">"reset graph"</span>`
);

const chatDrawer = document.getElementById("chatDrawer");
const chemAiToggle = document.getElementById("chemAiToggle");
const chatCloseBtn = document.getElementById("chatCloseBtn");
const chatPanelBody = document.getElementById("chatPanelBody");
const detailsPanelBody = document.getElementById("detailsPanelBody");
const drawerHeaderLabel = document.getElementById("drawerHeaderLabel");
const drawerBackToChatBtn = document.getElementById("drawerBackToChatBtn");

function openChatDrawer() {
  chatDrawer.classList.add("open");
  if (typeof network !== "undefined") requestAnimationFrame(() => network.redraw());
}
function closeChatDrawer() {
  chatDrawer.classList.remove("open");
  if (typeof network !== "undefined") requestAnimationFrame(() => network.redraw());
}

function showDrawerView(view) {
  openChatDrawer();
  const isChat = view === "chat";
  chatPanelBody.style.display = isChat ? "flex" : "none";
  detailsPanelBody.style.display = isChat ? "none" : "block";
  drawerHeaderLabel.innerHTML = isChat ? '<i class="ti ti-sparkles"></i> AI Chat' : '<i class="ti ti-info-circle"></i> Node details';
  drawerBackToChatBtn.style.display = isChat ? "none" : "inline-flex";
}

chemAiToggle.addEventListener("click", () => {
  if (chatDrawer.classList.contains("open") && chatPanelBody.style.display !== "none") {
    closeChatDrawer();
  } else {
    showDrawerView("chat");
  }
});
chatCloseBtn.addEventListener("click", closeChatDrawer);
drawerBackToChatBtn.addEventListener("click", () => showDrawerView("chat"));
