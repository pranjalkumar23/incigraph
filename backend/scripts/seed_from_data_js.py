"""
Loads the existing static data.js (the current source of truth, built by
scraper/build_app_data.py) into the Postgres schema. Run once to bootstrap the
DB, and re-run after every scraper refresh until the pipeline writes to the DB
directly instead of through data.js.

Usage:
    DATABASE_URL=postgresql://... python scripts/seed_from_data_js.py
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import Brand, Chemical, Product, Supplier  # noqa: E402

DATA_JS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data.js")
QUERIES_JS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "queries.js")


def load_array(content, name, end_marker):
    m = re.search(rf"const {name} = (\[.*?\]);\s*{end_marker}", content, re.S)
    if not m:
        raise ValueError(f"Could not find {name} in data.js")
    return json.loads(m.group(1))


def load_chem_formula_overrides():
    # The ~60 hand-curated chemicals only get their formula/mw/smiles merged in
    # client-side at runtime (queries.js's CHEM_FORMULA, applied via Object.assign) —
    # they were never baked into data.js itself. Parse that same JS object here so the
    # DB has the complete picture too, instead of nulls for exactly the original,
    # hand-vetted entries.
    with open(QUERIES_JS_PATH, encoding="utf-8") as f:
        content = f.read()
    m = re.search(r"const CHEM_FORMULA = \{(.*?)\n\};", content, re.S)
    if not m:
        return {}
    overrides = {}
    for entry_m in re.finditer(r"(c\d+):\s*\{([^}]*)\}", m.group(1)):
        chem_id, body = entry_m.group(1), entry_m.group(2)
        entry = {}
        for field in ("formula", "mw", "smiles"):
            field_m = re.search(rf'{field}:\s*"((?:[^"\\]|\\.)*)"', body)
            if field_m:
                entry[field] = field_m.group(1)
        overrides[chem_id] = entry
    return overrides


def main():
    with open(DATA_JS_PATH, encoding="utf-8") as f:
        content = f.read()

    suppliers = load_array(content, "SUPPLIERS", r"\n\nconst CHEMICALS")
    chemicals = load_array(content, "CHEMICALS", r"\n\nconst OEMS")
    brands = load_array(content, "BRANDS", r"\n\nconst PRODUCTS")
    products_match = re.search(r"const PRODUCTS = (\[.*\]);\s*$", content, re.S)
    products = json.loads(products_match.group(1))

    print(f"Loaded from data.js: {len(suppliers)} suppliers, {len(chemicals)} chemicals, "
          f"{len(brands)} brands, {len(products)} products")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        supplier_by_id = {}
        for s in suppliers:
            row = Supplier(
                id=s["id"],
                name=s["name"],
                country=s.get("country"),
                linkedin_company_url=s.get("linkedinCompanyUrl"),
                target_roles=s.get("targetRoles", []),
            )
            db.add(row)
            supplier_by_id[s["id"]] = row
        db.flush()

        chem_formula_overrides = load_chem_formula_overrides()

        chemical_by_id = {}
        for c in chemicals:
            override = chem_formula_overrides.get(c["id"], {})
            row = Chemical(
                id=c["id"],
                name=c["name"],
                inci=c.get("inci"),
                cas=c.get("cas"),
                category=c.get("category"),
                formula=c.get("formula") or override.get("formula"),
                mw=c.get("mw") or override.get("mw"),
                smiles=c.get("smiles") or override.get("smiles"),
                aliases=c.get("aliases", []),
            )
            row.suppliers = [supplier_by_id[sid] for sid in c.get("suppliers", []) if sid in supplier_by_id]
            db.add(row)
            chemical_by_id[c["id"]] = row
        db.flush()

        brand_by_id = {}
        for b in brands:
            mfg = b.get("manufacturer", {}) or {}
            row = Brand(
                id=b["id"],
                name=b["name"],
                website=b.get("website"),
                linkedin_company_url=b.get("linkedinCompanyUrl"),
                target_roles=b.get("targetRoles", []),
                public_contacts=b.get("publicContacts", {}),
                manufacturer_third_party_label=mfg.get("thirdPartyLabel"),
                manufacturer_third_party_value=mfg.get("thirdPartyValue"),
                manufacturer_third_party_source_url=mfg.get("thirdPartySourceUrl"),
                manufacturer_legal_entity_name=mfg.get("legalEntityName"),
                manufacturer_legal_entity_address=mfg.get("legalEntityAddress"),
                manufacturer_legal_entity_source_url=mfg.get("legalEntitySourceUrl"),
            )
            db.add(row)
            brand_by_id[b["id"]] = row
        db.flush()

        for i, p in enumerate(products):
            row = Product(
                id=p["id"],
                name=p["name"],
                brand_id=p["brand"],
                url=p.get("url"),
                ingredients_verified=bool(p.get("ingredientsVerified")),
                ingredients_raw=p.get("ingredientsRaw", []),
                image=p.get("image"),
                source=p.get("source", "brand-site"),
            )
            row.chemicals = [chemical_by_id[cid] for cid in p.get("chemicals", []) if cid in chemical_by_id]
            db.add(row)
            if (i + 1) % 1000 == 0:
                db.flush()
                print(f"  {i + 1}/{len(products)} products inserted")

        db.commit()
        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
