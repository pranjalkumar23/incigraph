const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
const CHEM_BY_ID = byId(CHEMICALS);
const SUP_BY_ID = byId(SUPPLIERS);
const BRAND_BY_ID = byId(BRANDS);
const PROD_BY_ID = byId(PRODUCTS);

function productsUsingChemical(chemId) {
  return PRODUCTS.filter((p) => p.chemicals.includes(chemId));
}
function brandsUsingChemical(chemId) {
  const brandIds = new Set(productsUsingChemical(chemId).map((p) => p.brand));
  return [...brandIds].map((id) => BRAND_BY_ID[id]);
}
function suppliersOfChemical(chemId) {
  return CHEM_BY_ID[chemId].suppliers.map((sid) => SUP_BY_ID[sid]);
}
function productsByBrand(brandId) {
  return PRODUCTS.filter((p) => p.brand === brandId);
}
function chemicalsByBrand(brandId) {
  const chemIds = new Set();
  productsByBrand(brandId).forEach((p) => p.chemicals.forEach((cid) => chemIds.add(cid)));
  return [...chemIds].map((id) => CHEM_BY_ID[id]);
}
function chemicalsInProduct(productId) {
  return PROD_BY_ID[productId].chemicals.map((cid) => CHEM_BY_ID[cid]);
}
function chemicalsSuppliedBy(supplierId) {
  return CHEMICALS.filter((c) => c.suppliers.includes(supplierId));
}

const ALIAS_TO_CHEMICAL = {};
CHEMICALS.forEach((c) => (c.aliases || []).forEach((a) => (ALIAS_TO_CHEMICAL[a.toLowerCase()] = c.id)));

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function allIngredientsInProduct(productId) {
  const p = PROD_BY_ID[productId];
  const raw = p.ingredientsRaw || [];
  const seen = new Set();
  const result = [];
  raw.forEach((token) => {
    const cleaned = token.trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    const chemId = ALIAS_TO_CHEMICAL[key];
    if (chemId) {
      if (!seen.has(`chemical:${chemId}`)) {
        seen.add(`chemical:${chemId}`);
        result.push({ type: "chemical", id: chemId, name: CHEM_BY_ID[chemId].name });
      }
    } else {
      const id = slugify(cleaned);
      if (!seen.has(`ingredient:${id}`)) {
        seen.add(`ingredient:${id}`);
        result.push({ type: "ingredient", id, name: cleaned });
      }
    }
  });
  return result;
}

const TYPE_LABEL = { chemical: "Chemical", brand: "Brand", product: "Product", supplier: "Supplier", ingredient: "Ingredient", manufacturer: "Manufacturer" };

function search(query, typeFilter) {
  const q = query.trim().toLowerCase();
  const results = [];
  if (typeFilter === "all" || typeFilter === "chemical") {
    CHEMICALS.forEach((c) => {
      if (!q || c.name.toLowerCase().includes(q) || c.inci.toLowerCase().includes(q) || c.cas.includes(q)) {
        results.push({ type: "chemical", id: c.id, name: c.name, sub: `${c.category} · CAS ${c.cas}` });
      }
    });
  }
  if (typeFilter === "all" || typeFilter === "brand") {
    BRANDS.forEach((b) => {
      if (!q || b.name.toLowerCase().includes(q)) {
        results.push({ type: "brand", id: b.id, name: b.name, sub: `${productsByBrand(b.id).length} products tracked` });
      }
    });
  }
  if (typeFilter === "all" || typeFilter === "product") {
    PRODUCTS.forEach((p) => {
      if (!q || p.name.toLowerCase().includes(q)) {
        results.push({ type: "product", id: p.id, name: p.name, sub: BRAND_BY_ID[p.brand].name });
      }
    });
  }
  if (typeFilter === "all" || typeFilter === "supplier") {
    SUPPLIERS.forEach((s) => {
      if (!q || s.name.toLowerCase().includes(q)) {
        results.push({ type: "supplier", id: s.id, name: s.name, sub: `${chemicalsSuppliedBy(s.id).length} chemicals listed · ${s.country}` });
      }
    });
  }
  return results.slice(0, 30);
}
