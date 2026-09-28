const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
const CHEM_BY_ID = byId(CHEMICALS);
const SUP_BY_ID = byId(SUPPLIERS);
const BRAND_BY_ID = byId(BRANDS);
const PROD_BY_ID = byId(PRODUCTS);

// Standard public chemistry reference data (formula / molecular weight / SMILES), keyed by chemical id.
// Hyaluronic Acid and Dimethicone are polymers with no single discrete structure, so no `smiles` is given for them.
const CHEM_FORMULA = {
  c1: { formula: "C6H6N2O", mw: "122.12 g/mol", smiles: "C1=CC(=CN=C1)C(=O)N" },
  c2: { formula: "(C14H21NO11)n — polymer", mw: "variable (50 kDa–6 MDa)" },
  c3: { formula: "C8H10O2", mw: "138.16 g/mol", smiles: "C1=CC=C(C=C1)OCCO" },
  c4: { formula: "C16H34O / C18H38O — mixture", mw: "~242–270 g/mol", smiles: "CCCCCCCCCCCCCCCCO" },
  c5: { formula: "C7H6O3", mw: "138.12 g/mol", smiles: "C1=CC=C(C(=C1)C(=O)O)O" },
  c6: { formula: "(C2H6OSi)n — polymer", mw: "variable" },
  c7: { formula: "C2H4O3", mw: "76.05 g/mol", smiles: "C(C(=O)O)O" },
  c8: { formula: "C10H30O5Si5", mw: "370.77 g/mol", smiles: "C[Si]1(C)O[Si](C)(C)O[Si](C)(C)O[Si](C)(C)O[Si]1(C)C" },
  c9: { formula: "C25H54ClN", mw: "404.16 g/mol", smiles: "CCCCCCCCCCCCCCCCCCCCCC[N+](C)(C)C.[Cl-]" },
  c10: { formula: "C9H19NO4", mw: "205.25 g/mol", smiles: "CC(C)(CO)C(O)C(=O)NCCCO" },
  c11: { formula: "C31H52O3", mw: "472.75 g/mol", smiles: "CC1=C(C)C2=C(C(=C1OC(C)=O)C)CCC(O2)(C)CCCC(C)CCCC(C)CCCC(C)C" },
  c12: { formula: "C10H14N2Na2O8", mw: "336.21 g/mol", smiles: "C(CN(CC(=O)[O-])CC(=O)O)N(CC(=O)O)CC(=O)[O-].[Na+].[Na+]" },
  c13: { formula: "C19H38N2O3 — approx.", mw: "~342.5 g/mol", smiles: "CCCCCCCCCCCCC(=O)NCCC[N+](C)(C)CC(=O)[O-]" },
  c14: { formula: "C7H5NaO2", mw: "144.10 g/mol", smiles: "C1=CC=C(C=C1)C(=O)[O-].[Na+]" },
  c15: { formula: "C6H7KO2", mw: "150.22 g/mol", smiles: "CC=CC=CC(=O)[O-].[K+]" },
  c16: { formula: "C11H24O3", mw: "204.31 g/mol", smiles: "CCCCC(CC)COC(CO)CO" },
  c17: { formula: "C14H12O3", mw: "228.24 g/mol", smiles: "C1=CC(=CC=C1C=CC2=CC(=CC(=C2)O)O)O" },
  c18: { formula: "C3H8O3", mw: "92.09 g/mol", smiles: "C(C(CO)O)O" },
  c19: { formula: "C6H8O7", mw: "192.12 g/mol", smiles: "C(C(=O)O)C(CC(=O)O)(C(=O)O)O" },
  c20: { formula: "C3H8O2", mw: "76.09 g/mol", smiles: "CC(CCO)O" },
  c21: { formula: "C6H8O6", mw: "176.12 g/mol", smiles: "C1=C(C(=O)OC1C(C(CO)O)O)O" },
  c22: { formula: "C20H30O", mw: "286.45 g/mol", smiles: "CC1=C(C(CCC1)(C)C)C=CC(=CC=CC(=CCO)C)C" },
  c23: { formula: "C3H6O3", mw: "90.08 g/mol", smiles: "CC(C(=O)O)O" },
  c24: { formula: "C6H6O4", mw: "142.11 g/mol", smiles: "OCC1=CC(=O)C(O)=CO1" },
  c25: { formula: "C10H16N2O3S", mw: "244.31 g/mol", smiles: "C1C2C(C(S1)CCCCC(=O)O)NC(=O)N2" },
  c26: { formula: "(C35H49O29)n — polymer", mw: "variable" },
  c27: { formula: "TiO2", mw: "79.87 g/mol", smiles: "O=[Ti]=O" },
  c28: { formula: "C15H24O", mw: "220.35 g/mol", smiles: "CC(C)(C)c1cc(C)cc(C(C)(C)C)c1O" },
  c29: { formula: "C18H26O3", mw: "290.40 g/mol", smiles: "COc1ccc(cc1)C=CC(=O)OCC(CC)CCCC" },
  c30: { formula: "C20H22O3", mw: "310.39 g/mol", smiles: "COc1ccc(cc1)C(=O)CC(=O)c1ccc(cc1)C(C)(C)C" },
  c31: { formula: "C15H22O3", mw: "250.33 g/mol", smiles: "CCCCC(CC)COC(=O)c1ccccc1O" },
  c32: { formula: "Mixture — polyoxyethylene alkyl ether sulfate", mw: "variable" },
  c33: { formula: "NaCl", mw: "58.44 g/mol", smiles: "[Na+].[Cl-]" },
  c34: { formula: "C10H12N2Na4O8", mw: "380.17 g/mol", smiles: "C(CN(CC(=O)[O-])CC(=O)[O-])N(CC(=O)[O-])CC(=O)[O-].[Na+].[Na+].[Na+].[Na+]" },
  c35: { formula: "NaOH", mw: "40.00 g/mol", smiles: "[Na+].[OH-]" },
  c36: { formula: "C3H8O", mw: "60.10 g/mol", smiles: "CC(C)O" },
  c37: { formula: "Mixture — C8/C10 fatty-acid triglycerides", mw: "~470–520 g/mol" },
  c38: { formula: "C18H36O2", mw: "284.48 g/mol", smiles: "CCCCCCCCCCCCCCCCCC(=O)O" },
  c39: { formula: "C4H10O2", mw: "90.12 g/mol", smiles: "CC(O)CCO" },
  c40: { formula: "C17H34O2", mw: "270.45 g/mol", smiles: "CCCCCCCCCCCCCC(=O)OC(C)C" },
  c41: { formula: "H3PO4", mw: "98.00 g/mol", smiles: "OP(=O)(O)O" },
  c42: { formula: "C8H18O2", mw: "146.23 g/mol", smiles: "CCCCCCC(O)CO" },
  c43: { formula: "C9H6O2", mw: "146.14 g/mol", smiles: "O=c1ccc2ccccc2o1" },
  c44: { formula: "C10H18O", mw: "154.25 g/mol", smiles: "CC(=CCCC(C)(C=C)O)C" },
  c45: { formula: "C10H16", mw: "136.23 g/mol", smiles: "CC1=CCC(CC1)C(=C)C" },
  c46: { formula: "C10H18O", mw: "154.25 g/mol", smiles: "CC(=CCCC(=CCO)C)C" },
  c47: { formula: "C10H20O", mw: "156.27 g/mol", smiles: "CC(CCO)CCC=C(C)C" },
  c48: { formula: "C6H14O6", mw: "182.17 g/mol", smiles: "C(C(C(C(C(CO)O)O)O)O)O" },
  c49: { formula: "C2H4O2", mw: "60.05 g/mol", smiles: "CC(=O)O" },
  c50: { formula: "KAl2(AlSi3O10)(OH)2 — mineral", mw: "variable" },
  c51: { formula: "Proprietary complex", mw: "N/A" },
  c52: { formula: "SiO2", mw: "60.08 g/mol", smiles: "O=[Si]=O" },
  c53: { formula: "Undisclosed proprietary blend", mw: "N/A" },
  c54: { formula: "Variable — class of amino-acid chains", mw: "variable" },
  c55: { formula: "C2H8NNa4O7P2", mw: "325.99 g/mol" },
  c56: { formula: "C10H12O2", mw: "164.20 g/mol", smiles: "COc1cc(C=CC)ccc1O" },
  c57: { formula: "C15H20O", mw: "216.32 g/mol", smiles: "c1ccccc1C=C(C=O)CCCCCC" },
  c58: { formula: "C14H12O3", mw: "228.24 g/mol", smiles: "OC1=CC=CC=C1C(=O)OCc1ccccc1" },
  c59: { formula: "C14H12O2", mw: "212.24 g/mol", smiles: "O=C(OCc1ccccc1)c1ccccc1" },
  c60: { formula: "C10H20O2", mw: "172.26 g/mol", smiles: "O=CCC(C)CCCC(C)(C)O" },
  c61: { formula: "Fe2O3 / Fe3O4 / FeO(OH) — mixture", mw: "variable" },
  c62: { formula: "C16H9N4Na3O9S2", mw: "534.36 g/mol" },
  c63: { formula: "C37H34N2Na2O9S3", mw: "792.85 g/mol" },
};
CHEMICALS.forEach((c) => Object.assign(c, CHEM_FORMULA[c.id]));

function chemStructureMarkup(type, refId, idPrefix, uid = refId, size = { width: 220, height: 140 }) {
  if (type !== "chemical") return "";
  const c = CHEM_BY_ID[refId];
  if (!c || !c.smiles) return "";
  return `<div class="chem-structure" id="${idPrefix}-${uid}" style="width:${size.width}px;height:${size.height}px;"></div>`;
}

function renderChemStructure(elId, smiles, size = { width: 220, height: 140 }) {
  const el = document.getElementById(elId);
  if (!el || !smiles || typeof OCL === "undefined") return;
  try {
    const mol = OCL.Molecule.fromSmiles(smiles);
    el.innerHTML = mol.toSVG(size.width, size.height);
  } catch (err) {
    console.warn("Structure render failed", smiles, err);
    el.style.display = "none";
  }
}

function drawChemStructureIfNeeded(type, refId, idPrefix, uid = refId, size = { width: 220, height: 140 }) {
  if (type !== "chemical") return;
  const c = CHEM_BY_ID[refId];
  if (!c || !c.smiles) return;
  renderChemStructure(`${idPrefix}-${uid}`, c.smiles, size);
}

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
