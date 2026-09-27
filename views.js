function switchView(viewName) {
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${viewName}`));
  if (viewName === "graph") requestAnimationFrame(() => network.redraw());
}

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

function goToBrand(id) {
  switchView("graph");
  setRoot("brand", id, BRAND_BY_ID[id].name);
}
function goToSupplier(id) {
  switchView("graph");
  setRoot("supplier", id, SUP_BY_ID[id].name);
}

/* Brands grid */

function renderBrandsGrid(filter) {
  const q = (filter || "").toLowerCase().trim();
  const grid = document.getElementById("brandsGrid");
  const list = BRANDS.filter((b) => !q || b.name.toLowerCase().includes(q));
  grid.innerHTML = list
    .map((b) => {
      const imgs = imageForNode("brand", b.id);
      const n = productsByBrand(b.id).length;
      return `<div class="brand-card" data-id="${b.id}">
        <img src="${imgs.image}" onerror="this.onerror=null;this.src='${imgs.brokenImage}'" />
        <p class="brand-name">${b.name}</p>
        <p class="brand-sub">${n} SKU(s)</p>
      </div>`;
    })
    .join("");
  grid.querySelectorAll(".brand-card").forEach((el) => {
    el.addEventListener("click", () => goToBrand(el.dataset.id));
  });
}

document.getElementById("brandsSearch").addEventListener("input", (e) => renderBrandsGrid(e.target.value));

/* Products list + detail */

function renderProductsList(filter) {
  const q = (filter || "").toLowerCase().trim();
  const listEl = document.getElementById("productsList");
  const items = PRODUCTS.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 200);
  listEl.innerHTML = items
    .map((p) => `<div class="list-row" data-id="${p.id}"><p class="row-name">${p.name}</p><p class="row-sub">${BRAND_BY_ID[p.brand].name}</p></div>`)
    .join("");
  listEl.querySelectorAll(".list-row").forEach((el) => {
    el.addEventListener("click", () => {
      listEl.querySelectorAll(".list-row").forEach((r) => r.classList.remove("active"));
      el.classList.add("active");
      renderProductDetail(el.dataset.id);
    });
  });
}

function renderProductDetail(id) {
  const p = PROD_BY_ID[id];
  const b = BRAND_BY_ID[p.brand];
  const imgs = imageForNode("product", id);
  const chems = chemicalsInProduct(id);
  const total = (p.ingredientsRaw && p.ingredientsRaw.length) || 0;
  const pane = document.getElementById("productDetail");
  pane.innerHTML = `
    <div class="detail-title"><img src="${imgs.image}" onerror="this.onerror=null;this.src='${imgs.brokenImage}'"/><h2>${p.name}</h2></div>
    <div class="detail-meta">
      Brand: <a href="#" data-brand="${b.id}">${b.name}</a><br/>
      <a href="${p.url}" target="_blank" rel="noopener">View source page</a><br/>
      ${p.ingredientsVerified ? "Verified ingredients" : "Ingredients unverified"} · ${total} ingredient(s) listed · ${chems.length} tracked chemical(s) matched
    </div>
    <div class="detail-section-title">Tracked chemicals (${chems.length})</div>
    ${chems.map((c) => `<div class="detail-rel-row" data-chem="${c.id}"><span>${c.name}</span><span class="badge">${c.category}</span></div>`).join("") || '<p class="empty-hint">None matched our tracked chemical list.</p>'}
    <div class="detail-section-title">Full scraped ingredient list (${total})</div>
    <p class="tag">${(p.ingredientsRaw || []).join(", ") || "None captured"}</p>
  `;
  pane.querySelectorAll("[data-brand]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      goToBrand(el.dataset.brand);
    })
  );
  pane.querySelectorAll("[data-chem]").forEach((el) =>
    el.addEventListener("click", () => {
      switchView("chemicals");
      selectChemical(el.dataset.chem);
    })
  );
}

function selectProductInList(id) {
  const p = PROD_BY_ID[id];
  document.getElementById("productsSearch").value = p.name;
  renderProductsList(p.name);
  renderProductDetail(id);
  const row = document.querySelector(`#productsList .list-row[data-id="${id}"]`);
  if (row) row.classList.add("active");
}

document.getElementById("productsSearch").addEventListener("input", (e) => renderProductsList(e.target.value));

/* Chemicals list + detail */

function renderChemicalsList() {
  const listEl = document.getElementById("chemicalsList");
  listEl.innerHTML = CHEMICALS.map((c) => `<div class="list-row" data-id="${c.id}"><p class="row-name">${c.name}</p><p class="row-sub">${c.category}</p></div>`).join("");
  listEl.querySelectorAll(".list-row").forEach((el) => el.addEventListener("click", () => selectChemical(el.dataset.id)));
}

function selectChemical(id) {
  document.querySelectorAll("#chemicalsList .list-row").forEach((r) => r.classList.toggle("active", r.dataset.id === id));
  const c = CHEM_BY_ID[id];
  const allProducts = productsUsingChemical(id);
  const allBrands = brandsUsingChemical(id);
  const sellers = suppliersOfChemical(id);
  const pane = document.getElementById("chemicalDetail");
  pane.innerHTML = `
    <div class="detail-title"><h2>${c.name}</h2></div>
    <div class="detail-meta">INCI: ${c.inci} · CAS ${c.cas} · ${c.category}</div>
    <div class="detail-section-title">Products using it (${allProducts.length})</div>
    ${allProducts.slice(0, 50).map((p) => `<div class="detail-rel-row" data-product="${p.id}"><span>${p.name}</span><span class="badge">${BRAND_BY_ID[p.brand].name}</span></div>`).join("") || '<p class="empty-hint">None found.</p>'}
    <div class="detail-section-title">Brands using it (${allBrands.length})</div>
    ${allBrands.slice(0, 50).map((b) => `<div class="detail-rel-row" data-brand="${b.id}"><span>${b.name}</span></div>`).join("") || '<p class="empty-hint">None found.</p>'}
    <div class="detail-section-title">Sellers — illustrative, not yet real supplier data (${sellers.length})</div>
    ${sellers.map((s) => `<div class="detail-rel-row" data-supplier="${s.id}"><span>${s.name}</span><span class="badge">${s.country}</span></div>`).join("")}
  `;
  pane.querySelectorAll("[data-brand]").forEach((el) => el.addEventListener("click", () => goToBrand(el.dataset.brand)));
  pane.querySelectorAll("[data-supplier]").forEach((el) => el.addEventListener("click", () => goToSupplier(el.dataset.supplier)));
  pane.querySelectorAll("[data-product]").forEach((el) =>
    el.addEventListener("click", () => {
      switchView("products");
      selectProductInList(el.dataset.product);
    })
  );
}

renderBrandsGrid("");
renderProductsList("");
renderChemicalsList();
if (CHEMICALS.length) selectChemical(CHEMICALS[0].id);

const globalSearchInput = document.getElementById("globalSearch");
globalSearchInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const q = globalSearchInput.value.trim();
  if (!q) return;
  const results = search(q, "all");
  if (results.length === 0) return;
  const best = results[0];
  switchView("graph");
  setRoot(best.type, best.id, best.name);
  globalSearchInput.value = "";
});
