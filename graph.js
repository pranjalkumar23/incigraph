const GROUP_STYLE = {
  chemical: { border: "#534AB7", font: "#26215C", icon: "⚗", bg: "#EEEDFE" },
  brand: { border: "#0F6E56", font: "#04342C", icon: "🏢", bg: "#E1F5EE" },
  product: { border: "#993C1D", font: "#4A1B0C", icon: "📦", bg: "#FAECE7" },
  supplier: { border: "#854F0B", font: "#412402", icon: "🚚", bg: "#FAEEDA" },
  outreach: { border: "#993556", font: "#4B1528", icon: "🔗", bg: "#FBEAF0" },
  ingredient: { border: "#5F5E5A", font: "#2C2C2A", icon: "🧪", bg: "#F1EFE8" },
  manufacturer: { border: "#0C447C", font: "#042C53", icon: "🏭", bg: "#E6F1FB" },
  more: { border: "#888780", font: "#444441", icon: "➕", bg: "#F1EFE8" },
};

const MAX_FANOUT = 8;

const nodesDS = new vis.DataSet([]);
const edgesDS = new vis.DataSet([]);
const expandedKeys = new Set();

const container = document.getElementById("network");
const network = new vis.Network(
  container,
  { nodes: nodesDS, edges: edgesDS },
  {
    autoResize: true,
    nodes: {
      shape: "circularImage",
      size: 26,
      borderWidth: 2,
      shapeProperties: { useBorderWithImage: true },
      color: { background: "#ffffff" },
      font: { size: 13, color: "#5f5e58", vadjust: 6 },
    },
    edges: {
      color: { color: "#c2c7cc", highlight: "#8a9099" },
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.55 },
      width: 1.5,
    },
    layout: {
      hierarchical: {
        direction: "UD",
        sortMethod: "directed",
        levelSeparation: 130,
        nodeSpacing: 190,
        treeSpacing: 240,
        blockShifting: true,
        edgeMinimization: true,
        shakeTowards: "leaves",
      },
    },
    physics: {
      stabilization: { iterations: 300, fit: true },
      hierarchicalRepulsion: {
        nodeDistance: 150,
        springLength: 130,
        springConstant: 0.02,
        damping: 0.5,
      },
      solver: "hierarchicalRepulsion",
    },
    interaction: { hover: true },
  }
);

network.on("stabilizationIterationsDone", () => {
  network.setOptions({ physics: false });
});

function connectedComponent(startId) {
  const visited = new Set([startId]);
  const queue = [startId];
  while (queue.length) {
    const cur = queue.pop();
    edgesDS.get().forEach((e) => {
      if (e.hidden) return;
      if (e.from === cur && !visited.has(e.to)) {
        visited.add(e.to);
        queue.push(e.to);
      }
      if (e.to === cur && !visited.has(e.from)) {
        visited.add(e.from);
        queue.push(e.from);
      }
    });
  }
  return visited;
}

function largestComponentIds() {
  const visible = nodesDS.get().filter((n) => !n.hidden).map((n) => n.id);
  const seen = new Set();
  let best = [];
  visible.forEach((id) => {
    if (seen.has(id)) return;
    const comp = connectedComponent(id);
    comp.forEach((c) => seen.add(c));
    const compVisible = visible.filter((v) => comp.has(v));
    if (compVisible.length > best.length) best = compVisible;
  });
  return best;
}

function fitVisible(animation, focusNid) {
  let ids;
  if (focusNid && nodesDS.get(focusNid)) {
    const comp = connectedComponent(focusNid);
    ids = nodesDS.get().filter((n) => !n.hidden && comp.has(n.id)).map((n) => n.id);
  } else {
    ids = largestComponentIds();
    if (!ids.length) ids = nodesDS.get().filter((n) => !n.hidden).map((n) => n.id);
  }
  network.fit({ animation, nodes: ids });
  return ids;
}

let lastFocusNid = null;

window.addEventListener("resize", () => {
  if (lastFocusNid && nodesDS.get(lastFocusNid)) {
    requestAnimationFrame(() => fitVisible(false, lastFocusNid));
  }
});

function estimatedNodeWidth(nodeType) {
  return CARD_TYPES.has(nodeType) ? 190 : 100;
}

function wrapGroup(group) {
  const memberIds = group.memberNids.filter((id) => {
    const n = nodesDS.get(id);
    return n && !n.hidden;
  });
  if (memberIds.length < 2) return;
  const sampleNode = nodesDS.get(memberIds[0]);
  const nodeWidth = estimatedNodeWidth(sampleNode.nodeType);
  const containerWidth = container.clientWidth || 900;
  const perRow = Math.max(2, Math.floor(containerWidth / nodeWidth));
  if (memberIds.length <= perRow) return;
  const positions = network.getPositions(memberIds);
  const parentPositions = network.getPositions([group.parentNid]);
  const centerX = parentPositions[group.parentNid] ? parentPositions[group.parentNid].x : positions[memberIds[0]].x;
  const baseY = Math.min(...memberIds.map((id) => positions[id].y));
  const subRowGap = CARD_TYPES.has(sampleNode.nodeType) ? 90 : 70;
  const gridLeft = centerX - ((perRow - 1) * nodeWidth) / 2;
  memberIds.forEach((id, i) => {
    const rowIdx = Math.floor(i / perRow);
    const col = i % perRow;
    network.moveNode(id, gridLeft + col * nodeWidth, baseY + rowIdx * subRowGap);
  });
}

function settleLayout(focusNid) {
  network.setOptions({ physics: true });
  network.once("stabilizationIterationsDone", () => {
    siblingGroups.forEach(wrapGroup);
    fitVisible({ duration: 200 }, focusNid);
    lastFocusNid = focusNid && nodesDS.get(focusNid) ? focusNid : lastFocusNid;
  });
  network.stabilize(200);
}

function nodeIdFor(type, id) {
  return `${type}:${id}`;
}

function placeholderImage(type) {
  const style = GROUP_STYLE[type];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="40" fill="${style.bg}"/><text x="40" y="52" font-size="34" text-anchor="middle">${style.icon}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return null;
  }
}

function imageForNode(type, id, extra) {
  const fallback = placeholderImage(type);
  if (type === "brand") {
    const b = BRAND_BY_ID[id];
    const domain = b && b.website ? domainOf(b.website) : null;
    return { image: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : fallback, brokenImage: fallback };
  }
  if (type === "product") {
    const p = PROD_BY_ID[id];
    return { image: (p && p.image) || fallback, brokenImage: fallback };
  }
  return { image: fallback, brokenImage: fallback };
}

const LABEL_MAX_CHARS_PER_LINE = 14;
const LABEL_MAX_LINES = 2;

function wrapLabel(text, maxCharsPerLine, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  let wordIndex = 0;
  while (wordIndex < words.length && lines.length < maxLines) {
    const word = words[wordIndex];
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = "";
    } else {
      current = candidate;
      wordIndex++;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  const truncated = wordIndex < words.length;
  if (truncated && lines.length) {
    let last = lines[lines.length - 1];
    if (last.length > maxCharsPerLine - 1) last = last.slice(0, maxCharsPerLine - 1);
    lines[lines.length - 1] = `${last}…`;
  }
  return lines.join("\n");
}

const CARD_TYPES = new Set(["chemical", "supplier", "manufacturer", "ingredient", "outreach", "more"]);

function addNode(type, id, label, extra) {
  const nid = nodeIdFor(type, id);
  if (!nodesDS.get(nid)) {
    const style = GROUP_STYLE[type];
    const isCard = CARD_TYPES.has(type);
    const wrapped = wrapLabel(label, isCard ? 16 : LABEL_MAX_CHARS_PER_LINE, LABEL_MAX_LINES);
    const base = isCard
      ? {
          shape: "box",
          label: `${style.icon}  ${wrapped}`,
          margin: 10,
          color: { background: style.bg, border: style.border, highlight: { background: style.bg, border: style.border } },
          font: { color: style.font, align: "left", size: 12 },
        }
      : {
          label: wrapped,
          image: imageForNode(type, id, extra).image,
          brokenImage: imageForNode(type, id, extra).brokenImage,
          color: { border: style.border, background: "#ffffff" },
          font: { color: style.font },
        };
    nodesDS.add(Object.assign({ id: nid, nodeType: type, refId: id, rawLabel: label }, base, extra || {}));
  }
  return nid;
}

function addEdge(a, b, label) {
  const eid = [a, b].sort().join("|");
  if (!edgesDS.get(eid)) {
    const bType = nodesDS.get(b).nodeType;
    const illustrative = bType === "outreach" || bType === "supplier";
    edgesDS.add({ id: eid, from: a, to: b, dashes: illustrative, label: label || undefined, font: { size: 10, color: "#8a90a0", align: "top" } });
  }
}

const siblingGroups = new Map();

function addCapped(parentNid, items, nodeType, relationKey, edgeLabel) {
  const groupKey = `${parentNid}::${nodeType}::${relationKey}`;
  const shown = items.slice(0, MAX_FANOUT);
  const memberNids = shown.map((item) => {
    const cid = addNode(nodeType, item.id, item.name);
    addEdge(parentNid, cid, edgeLabel);
    return cid;
  });
  const remainder = items.slice(MAX_FANOUT);
  let moreNid = null;
  if (remainder.length > 0) {
    moreNid = addNode("more", `${parentNid}:${nodeType}:${relationKey}`, `+${remainder.length} more`, {
      moreItems: remainder.map((i) => ({ type: nodeType, id: i.id, name: i.name })),
      groupKey,
    });
    addEdge(parentNid, moreNid);
  }
  siblingGroups.set(groupKey, { parentNid, nodeType, relationKey, memberNids, moreNid, hidden: false, itemLabel: TYPE_LABEL[nodeType] });
}

function addCappedMixed(parentNid, items, relationKey, itemLabel, edgeLabel) {
  const groupKey = `${parentNid}::mixed::${relationKey}`;
  const shown = items.slice(0, MAX_FANOUT);
  const memberNids = shown.map((item) => {
    const cid = addNode(item.type, item.id, item.name);
    addEdge(parentNid, cid, edgeLabel);
    return cid;
  });
  const remainder = items.slice(MAX_FANOUT);
  let moreNid = null;
  if (remainder.length > 0) {
    moreNid = addNode("more", `${parentNid}:mixed:${relationKey}`, `+${remainder.length} more`, {
      moreItems: remainder.map((i) => ({ type: i.type, id: i.id, name: i.name })),
      groupKey,
    });
    addEdge(parentNid, moreNid);
  }
  siblingGroups.set(groupKey, { parentNid, nodeType: "ingredient", relationKey, memberNids, moreNid, hidden: false, itemLabel });
}

function setNodeHidden(nid, hidden) {
  nodesDS.update({ id: nid, hidden });
  edgesDS.get().forEach((e) => {
    if (e.from === nid || e.to === nid) edgesDS.update({ id: e.id, hidden });
  });
  network.redraw();
}

function focusOn(nid) {
  siblingGroups.forEach((group) => {
    if (group.hidden) return;
    if (group.memberNids.includes(nid)) {
      group.memberNids.forEach((m) => {
        if (m !== nid) setNodeHidden(m, true);
      });
      if (group.moreNid) setNodeHidden(group.moreNid, true);
      group.hidden = true;
    }
  });
}

function restoreGroup(groupKey) {
  const group = siblingGroups.get(groupKey);
  if (!group) return;
  group.memberNids.forEach((m) => setNodeHidden(m, false));
  if (group.moreNid) setNodeHidden(group.moreNid, false);
  group.hidden = false;
}

function markExpanded(nid, relation) {
  expandedKeys.add(`${nid}::${relation}`);
}
function isExpanded(nid, relation) {
  return expandedKeys.has(`${nid}::${relation}`);
}

function hasRealOutreachData(entity) {
  if (!entity) return false;
  if (entity.linkedinCompanyUrl) return true;
  const contacts = entity.publicContacts;
  if (contacts && ((contacts.emails || []).length || (contacts.phones || []).length)) return true;
  return false;
}

function outreachDetail(entity) {
  return {
    linkedinCompanyUrl: entity.linkedinCompanyUrl || null,
    targetRoles: entity.targetRoles || [],
    publicContacts: entity.publicContacts || null,
  };
}

const EXPANDERS = {
  chemical: {
    brands: {
      label: "Show brands using it",
      run: (nid, refId) => addCapped(nid, brandsUsingChemical(refId), "brand", "brands", "Used by"),
    },
    sellers: {
      label: "Show sellers of it",
      run: (nid, refId) => addCapped(nid, suppliersOfChemical(refId), "supplier", "sellers", "Sold by"),
    },
    products: {
      label: "Show products using it",
      run: (nid, refId) => addCapped(nid, productsUsingChemical(refId), "product", "products", "Used in"),
    },
  },
  brand: {
    products: {
      label: "Show its products",
      run: (nid, refId) => addCapped(nid, productsByBrand(refId), "product", "products", "Sells"),
    },
    chemicals: {
      label: "Show chemicals it uses",
      run: (nid, refId) => addCapped(nid, chemicalsByBrand(refId), "chemical", "chemicals", "Uses"),
    },
    outreach: {
      label: "Show LinkedIn outreach info",
      available: (refId) => hasRealOutreachData(BRAND_BY_ID[refId]),
      run: (nid, refId) => {
        const b = BRAND_BY_ID[refId];
        addEdge(nid, addNode("outreach", `brand-${refId}`, `${b.name} outreach`, outreachDetail(b)), "Contact");
      },
    },
    manufacturer: {
      label: "Show manufacturer",
      run: (nid, refId) => {
        const b = BRAND_BY_ID[refId];
        const mfg = b.manufacturer || {};
        const isThirdParty = !!mfg.thirdPartyValue;
        const label = mfg.thirdPartyValue || mfg.legalEntityName || "Not publicly disclosed";
        addEdge(
          nid,
          addNode("manufacturer", `mfg-${refId}`, label, {
            isThirdParty,
            thirdPartyLabel: mfg.thirdPartyLabel || null,
            thirdPartyValue: mfg.thirdPartyValue || null,
            thirdPartySourceUrl: mfg.thirdPartySourceUrl || null,
            legalEntityName: mfg.legalEntityName || null,
            legalEntityAddress: mfg.legalEntityAddress || null,
            legalEntitySourceUrl: mfg.legalEntitySourceUrl || null,
          }),
          "Made by"
        );
      },
    },
  },
  product: {
    ingredients: {
      label: "Show all ingredients",
      run: (nid, refId) => addCappedMixed(nid, allIngredientsInProduct(refId), "ingredients", "ingredient", "Contains"),
    },
    brand: {
      label: "Show its brand",
      run: (nid, refId) => {
        const b = BRAND_BY_ID[PROD_BY_ID[refId].brand];
        addEdge(nid, addNode("brand", b.id, b.name), "Sold by");
      },
    },
  },
  supplier: {
    chemicals: {
      label: "Show chemicals it sells",
      run: (nid, refId) => addCapped(nid, chemicalsSuppliedBy(refId), "chemical", "chemicals", "Supplies"),
    },
    outreach: {
      label: "Show LinkedIn outreach info",
      available: (refId) => hasRealOutreachData(SUP_BY_ID[refId]),
      run: (nid, refId) => {
        const s = SUP_BY_ID[refId];
        addEdge(nid, addNode("outreach", `supplier-${refId}`, `${s.name} outreach`, outreachDetail(s)), "Contact");
      },
    },
  },
  outreach: {},
  ingredient: {},
  manufacturer: {},
  more: {
    reveal: {
      label: "Show all in graph",
      run: (nid) => {
        const node = nodesDS.get(nid);
        const items = node.moreItems || [];
        const group = siblingGroups.get(node.groupKey);
        const parentNid = group ? group.parentNid : null;
        items.forEach((i) => {
          const cid = addNode(i.type, i.id, i.name);
          if (parentNid) addEdge(parentNid, cid);
          if (group) group.memberNids.push(cid);
        });
        if (group) group.moreNid = null;
        nodesDS.remove(nid);
        edgesDS.get().forEach((e) => {
          if (e.from === nid || e.to === nid) edgesDS.remove(e.id);
        });
      },
    },
  },
};

function detailLine(node) {
  const type = node.nodeType;
  const refId = node.refId;
  if (type === "chemical") {
    const c = CHEM_BY_ID[refId];
    return `${c.category} · CAS ${c.cas} · INCI: ${c.inci}${c.formula ? `<br/>Formula: ${c.formula}${c.mw ? ` · MW: ${c.mw}` : ""}` : ""}`;
  }
  if (type === "brand") {
    const b = BRAND_BY_ID[refId];
    const n = productsByBrand(refId).length;
    return `Brand: ${b.name}<br/>SKUs: ${n}${b.website ? `<br/>${b.website}` : ""}`;
  }
  if (type === "product") {
    const p = PROD_BY_ID[refId];
    const verified = p.ingredientsVerified === undefined ? "" : p.ingredientsVerified ? " · verified ingredients" : " · ingredients unverified";
    const total = (p.ingredientsRaw && p.ingredientsRaw.length) || 0;
    const tracked = chemicalsInProduct(refId).length;
    return `${BRAND_BY_ID[p.brand].name}${verified}<br/>${total} ingredient(s) listed · ${tracked} match our tracked chemicals`;
  }
  if (type === "supplier") {
    const s = SUP_BY_ID[refId];
    return `${s.country} · ${chemicalsSuppliedBy(refId).length} chemical(s) tracked`;
  }
  if (type === "ingredient") {
    return `Listed ingredient — not in our tracked chemical database (no CAS/category on file).`;
  }
  if (type === "manufacturer") {
    if (node.isThirdParty) {
      const parts = [`<em>${node.thirdPartyLabel || "Manufacturer"} — disclosed on a third-party marketplace listing.</em>`];
      if (node.thirdPartySourceUrl) parts.push(`<a href="${node.thirdPartySourceUrl}" target="_blank" rel="noopener">Source listing</a>`);
      return parts.join("<br/>");
    }
    if (node.legalEntityName) {
      const parts = [`<em>Brand's own registered legal entity — no separate third-party manufacturer was found disclosed anywhere.</em>`];
      if (node.legalEntityAddress) parts.unshift(node.legalEntityAddress);
      if (node.legalEntitySourceUrl) parts.push(`<a href="${node.legalEntitySourceUrl}" target="_blank" rel="noopener">Source page</a>`);
      return parts.join("<br/>");
    }
    return `Not found — neither a third-party listing nor the brand's own site disclosed a manufacturer or legal entity.`;
  }
  if (type === "outreach") {
    const parts = [];
    if (node.linkedinCompanyUrl) parts.push(`<a href="${node.linkedinCompanyUrl}" target="_blank" rel="noopener">LinkedIn company page</a>`);
    if (node.targetRoles && node.targetRoles.length) parts.push(`Target roles: ${node.targetRoles.join(", ")}`);
    if (node.publicContacts && (node.publicContacts.emails.length || node.publicContacts.phones.length)) {
      parts.push(`Public contact: ${[...node.publicContacts.emails, ...node.publicContacts.phones].join(", ")}`);
    }
    parts.push(`<em>Manual outreach only — no scraped personal profiles.</em>`);
    return parts.join("<br/>");
  }
  if (type === "more") {
    const items = node.moreItems || [];
    const preview = items.slice(0, 3).map((i) => i.name).join(", ");
    return `${items.length} not shown to keep the graph readable${preview ? ` (e.g. ${preview}...)` : ""}`;
  }
  return "";
}

const hoverMenu = document.getElementById("expandMenu");
let hideTimer = null;

function cancelHide() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}
function scheduleHide() {
  cancelHide();
  hideTimer = setTimeout(() => {
    hoverMenu.style.display = "none";
  }, 220);
}

function showHoverMenu(nid, domPos) {
  cancelHide();
  const node = nodesDS.get(nid);
  const relations = EXPANDERS[node.nodeType] || {};
  const buttons = Object.entries(relations)
    .filter(([, rel]) => !rel.available || rel.available(node.refId))
    .map(([relKey, rel]) => {
      const done = isExpanded(nid, relKey);
      return `<button data-rel="${relKey}" ${done ? "disabled" : ""}>${rel.label}${done ? " (shown)" : ""}</button>`;
    })
    .join("");
  const hiddenGroups = [];
  siblingGroups.forEach((group, key) => {
    if (group.parentNid === nid && group.hidden) hiddenGroups.push([key, group]);
  });
  const restoreButtons = hiddenGroups
    .map(([key, group]) => `<button data-restore="${key}">Show ${group.memberNids.length} hidden ${group.itemLabel || TYPE_LABEL[group.nodeType]}(s)</button>`)
    .join("");
  hoverMenu.innerHTML = `
    <p class="expand-menu-title">${GROUP_STYLE[node.nodeType].icon} ${node.rawLabel}</p>
    <p class="expand-menu-detail">${detailLine(node)}</p>
    ${buttons}
    ${restoreButtons}
  `;
  hoverMenu.style.display = "flex";
  hoverMenu.style.left = `${domPos.x + 12}px`;
  hoverMenu.style.top = `${domPos.y + 12}px`;

  hoverMenu.querySelectorAll("button[data-rel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      relations[btn.dataset.rel].run(nid, node.refId);
      markExpanded(nid, btn.dataset.rel);
      focusOn(nid);
      if (nodesDS.get(nid)) {
        showHoverMenu(nid, domPos);
      } else {
        hoverMenu.style.display = "none";
      }
      settleLayout(nid);
    });
  });
  hoverMenu.querySelectorAll("button[data-restore]").forEach((btn) => {
    btn.addEventListener("click", () => {
      restoreGroup(btn.dataset.restore);
      showHoverMenu(nid, domPos);
      settleLayout(nid);
    });
  });
}

network.on("hoverNode", (params) => {
  showHoverMenu(params.node, params.pointer.DOM);
});
network.on("blurNode", scheduleHide);
network.on("dragStart", () => {
  hoverMenu.style.display = "none";
});
network.on("zoom", () => {
  hoverMenu.style.display = "none";
});
hoverMenu.addEventListener("mouseenter", cancelHide);
hoverMenu.addEventListener("mouseleave", scheduleHide);

function renderNodeDetails(nid) {
  const node = nodesDS.get(nid);
  if (!node) return;
  const style = GROUP_STYLE[node.nodeType];
  const relations = EXPANDERS[node.nodeType] || {};
  const buttons = Object.entries(relations)
    .filter(([, rel]) => !rel.available || rel.available(node.refId))
    .map(([relKey, rel]) => {
      const done = isExpanded(nid, relKey);
      return `<button class="detail-action-btn" data-rel="${relKey}" ${done ? "disabled" : ""}>${rel.label}${done ? " (shown)" : ""}</button>`;
    })
    .join("");
  const hiddenGroups = [];
  siblingGroups.forEach((group, key) => {
    if (group.parentNid === nid && group.hidden) hiddenGroups.push([key, group]);
  });
  const restoreButtons = hiddenGroups
    .map(([key, group]) => `<button class="detail-action-btn" data-restore="${key}">Show ${group.memberNids.length} hidden ${group.itemLabel || TYPE_LABEL[group.nodeType]}(s)</button>`)
    .join("");

  const detailsPanelBody = document.getElementById("detailsPanelBody");
  detailsPanelBody.innerHTML = `
    <div class="detail-card">
      <div class="detail-card-header" style="background:${style.bg};border-color:${style.border};">
        <span class="detail-card-icon">${style.icon}</span>
        <div>
          <div class="detail-card-title">${node.rawLabel}</div>
          <div class="detail-card-type">${TYPE_LABEL[node.nodeType] || node.nodeType}</div>
        </div>
      </div>
      <div class="detail-card-body">${detailLine(node)}</div>
      ${buttons || restoreButtons ? `<div class="detail-card-actions">${buttons}${restoreButtons}</div>` : ""}
    </div>
  `;
  detailsPanelBody.querySelectorAll("button[data-rel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      relations[btn.dataset.rel].run(nid, node.refId);
      markExpanded(nid, btn.dataset.rel);
      focusOn(nid);
      settleLayout(nid);
      if (nodesDS.get(nid)) renderNodeDetails(nid);
    });
  });
  detailsPanelBody.querySelectorAll("button[data-restore]").forEach((btn) => {
    btn.addEventListener("click", () => {
      restoreGroup(btn.dataset.restore);
      settleLayout(nid);
      renderNodeDetails(nid);
    });
  });
}

network.on("click", (params) => {
  if (params.nodes.length === 1) {
    renderNodeDetails(params.nodes[0]);
    showDrawerView("details");
  }
});

function setRoot(type, id, label) {
  nodesDS.clear();
  edgesDS.clear();
  expandedKeys.clear();
  hoverMenu.style.display = "none";
  const nid = addNode(type, id, label);
  network.fit({ animation: false });
  return nid;
}

function ensureNode(type, id, label) {
  return addNode(type, id, label);
}

function resetGraph() {
  nodesDS.clear();
  edgesDS.clear();
  expandedKeys.clear();
  hoverMenu.style.display = "none";
}

document.getElementById("resetBtn").addEventListener("click", resetGraph);

document.getElementById("legend").innerHTML = Object.entries(GROUP_STYLE)
  .filter(([type]) => type !== "more")
  .map(([type, style]) => `<span class="legend-item"><span class="legend-dot" style="border-color:${style.border}">${style.icon}</span>${type === "outreach" ? "LinkedIn outreach" : TYPE_LABEL[type]}</span>`)
  .join("");

setRoot("chemical", "c1", CHEM_BY_ID["c1"].name);
