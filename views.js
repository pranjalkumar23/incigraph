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
      return `<div class="entity-card" data-id="${b.id}">
        <img src="${imgs.image}" onerror="this.onerror=null;this.src='${imgs.brokenImage}'" />
        <p class="entity-name">${b.name}</p>
        <p class="entity-sub">${n} SKU(s)</p>
      </div>`;
    })
    .join("");
  grid.querySelectorAll(".entity-card").forEach((el) => {
    el.addEventListener("click", () => goToBrand(el.dataset.id));
  });
}

document.getElementById("brandsSearch").addEventListener("input", (e) => renderBrandsGrid(e.target.value));

/* Products grid */

function renderProductsGrid(filter) {
  const q = (filter || "").toLowerCase().trim();
  const grid = document.getElementById("productsGrid");
  const list = PRODUCTS.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 300);
  grid.innerHTML = list
    .map((p) => {
      const imgs = imageForNode("product", p.id);
      const b = BRAND_BY_ID[p.brand];
      const tracked = chemicalsInProduct(p.id).length;
      const total = (p.ingredientsRaw && p.ingredientsRaw.length) || 0;
      return `<div class="entity-card" data-id="${p.id}">
        <img src="${imgs.image}" onerror="this.onerror=null;this.src='${imgs.brokenImage}'" />
        <p class="entity-name">${p.name}</p>
        <p class="entity-sub">${b.name}</p>
        <p class="entity-sub">${tracked} tracked chem(s) · ${total} listed</p>
      </div>`;
    })
    .join("");
  grid.querySelectorAll(".entity-card").forEach((el) => {
    el.addEventListener("click", () => {
      const p = PROD_BY_ID[el.dataset.id];
      switchView("products");
      renderEntityDetailsStandalone("product", p.id, p.name);
    });
  });
}

document.getElementById("productsSearch").addEventListener("input", (e) => renderProductsGrid(e.target.value));

/* Chemicals grid */

function renderChemicalsGrid(filter) {
  const q = (filter || "").toLowerCase().trim();
  const grid = document.getElementById("chemicalsGrid");
  const list = CHEMICALS.filter((c) => !q || c.name.toLowerCase().includes(q));
  const style = GROUP_STYLE.chemical;
  grid.innerHTML = list
    .map((c) => {
      const productsCount = productsUsingChemical(c.id).length;
      const brandsCount = brandsUsingChemical(c.id).length;
      return `<div class="entity-card" data-id="${c.id}">
        <span class="entity-icon" style="background:${style.bg};border-color:${style.border};">${style.icon}</span>
        <p class="entity-name">${c.name}</p>
        <p class="entity-sub">${c.category}</p>
        <p class="entity-sub">${productsCount} product(s) · ${brandsCount} brand(s)</p>
      </div>`;
    })
    .join("");
  grid.querySelectorAll(".entity-card").forEach((el) => {
    el.addEventListener("click", () => {
      const c = CHEM_BY_ID[el.dataset.id];
      switchView("chemicals");
      renderEntityDetailsStandalone("chemical", c.id, c.name);
    });
  });
}

document.getElementById("chemicalsSearch").addEventListener("input", (e) => renderChemicalsGrid(e.target.value));

renderBrandsGrid("");
renderProductsGrid("");
renderChemicalsGrid("");

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
