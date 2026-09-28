import json
import re

TRACKED_CHEMICALS = [
    {"id": "c1", "name": "Niacinamide", "inci": "Niacinamide", "cas": "98-92-0", "category": "Active - brightening",
     "suppliers": ["s1", "s2", "s3", "s6"], "aliases": ["niacinamide"]},
    {"id": "c2", "name": "Hyaluronic Acid", "inci": "Sodium Hyaluronate", "cas": "9067-32-7", "category": "Active - hydration",
     "suppliers": ["s2", "s4", "s7"], "aliases": ["sodium hyaluronate", "hyaluronic acid", "hydrolyzed sodium hyaluronate", "sodium acetylated hyaluronate", "sodium hyaluronate crosspolymer"]},
    {"id": "c3", "name": "Phenoxyethanol", "inci": "Phenoxyethanol", "cas": "122-99-6", "category": "Preservative",
     "suppliers": ["s3", "s5", "s6"], "aliases": ["phenoxyethanol"]},
    {"id": "c4", "name": "Cetearyl Alcohol", "inci": "Cetearyl Alcohol", "cas": "67762-27-0", "category": "Emulsifier",
     "suppliers": ["s1", "s5"], "aliases": ["cetearyl alcohol"]},
    {"id": "c5", "name": "Salicylic Acid", "inci": "Salicylic Acid", "cas": "69-72-7", "category": "Active - exfoliant",
     "suppliers": ["s3", "s4", "s8"], "aliases": ["salicylic acid"]},
    {"id": "c6", "name": "Dimethicone", "inci": "Dimethicone", "cas": "9006-65-9", "category": "Silicone / texture",
     "suppliers": ["s6", "s7"], "aliases": ["dimethicone", "phenyl trimethicone", "cetyl peg/ppg-10/1 dimethicone"]},
    {"id": "c7", "name": "Glycolic Acid", "inci": "Glycolic Acid", "cas": "79-14-1", "category": "Active - exfoliant",
     "suppliers": ["s3", "s4"], "aliases": ["glycolic acid"]},
    {"id": "c8", "name": "Cyclopentasiloxane", "inci": "Cyclopentasiloxane", "cas": "541-02-6", "category": "Silicone / texture",
     "suppliers": ["s6", "s7"], "aliases": ["cyclopentasiloxane"]},
    {"id": "c9", "name": "Behentrimonium Chloride", "inci": "Behentrimonium Chloride", "cas": "17301-53-1", "category": "Conditioning agent",
     "suppliers": ["s4", "s5"], "aliases": ["behentrimonium chloride"]},
    {"id": "c10", "name": "Panthenol", "inci": "Panthenol", "cas": "81-13-0", "category": "Active - soothing",
     "suppliers": ["s2", "s3"], "aliases": ["panthenol"]},
    {"id": "c11", "name": "Tocopheryl Acetate", "inci": "Tocopheryl Acetate", "cas": "7695-91-2", "category": "Antioxidant",
     "suppliers": ["s2", "s8"], "aliases": ["tocopheryl acetate", "tocopherol"]},
    {"id": "c12", "name": "Disodium EDTA", "inci": "Disodium EDTA", "cas": "139-33-3", "category": "Chelating agent",
     "suppliers": ["s5", "s6"], "aliases": ["disodium edta"]},
    {"id": "c13", "name": "Cocamidopropyl Betaine", "inci": "Cocamidopropyl Betaine", "cas": "61789-40-0", "category": "Surfactant",
     "suppliers": ["s4", "s7"], "aliases": ["cocamidopropyl betaine"]},
    {"id": "c14", "name": "Sodium Benzoate", "inci": "Sodium Benzoate", "cas": "532-32-1", "category": "Preservative",
     "suppliers": ["s3", "s5"], "aliases": ["sodium benzoate"]},
    {"id": "c15", "name": "Potassium Sorbate", "inci": "Potassium Sorbate", "cas": "24634-61-5", "category": "Preservative",
     "suppliers": ["s3", "s5"], "aliases": ["potassium sorbate"]},
    {"id": "c16", "name": "Ethylhexylglycerin", "inci": "Ethylhexylglycerin", "cas": "70445-33-9", "category": "Preservative booster",
     "suppliers": ["s5", "s6"], "aliases": ["ethylhexylglycerin"]},
    {"id": "c17", "name": "Resveratrol", "inci": "Resveratrol", "cas": "501-36-0", "category": "Active - antioxidant",
     "suppliers": ["s2", "s8"], "aliases": ["resveratrol", "encapsulated resveratrol"]},
    {"id": "c18", "name": "Glycerin", "inci": "Glycerin", "cas": "56-81-5", "category": "Humectant",
     "suppliers": ["s1", "s4", "s7"], "aliases": ["glycerin"]},
    {"id": "c19", "name": "Citric Acid", "inci": "Citric Acid", "cas": "77-92-9", "category": "pH adjuster",
     "suppliers": ["s3", "s5"], "aliases": ["citric acid"]},
    {"id": "c20", "name": "Propylene Glycol", "inci": "Propylene Glycol", "cas": "57-55-6", "category": "Humectant",
     "suppliers": ["s1", "s4"], "aliases": ["propylene glycol"]},
]

SUPPLIERS = [
    {"id": "s1", "name": "Croda International", "country": "UK", "linkedinCompanyUrl": "https://www.linkedin.com/company/croda/", "targetRoles": ["India Country Manager", "Key Account Manager - Personal Care"]},
    {"id": "s2", "name": "DSM-Firmenich", "country": "Netherlands", "linkedinCompanyUrl": "https://www.linkedin.com/company/dsm-firmenich/", "targetRoles": ["Business Development Manager", "Regional Sales Head"]},
    {"id": "s3", "name": "BASF Care Creations", "country": "Germany", "linkedinCompanyUrl": "https://www.linkedin.com/company/basf/", "targetRoles": ["Personal Care Sales Manager"]},
    {"id": "s4", "name": "Ashland", "country": "USA", "linkedinCompanyUrl": "https://www.linkedin.com/company/ashland/", "targetRoles": ["Technical Sales Manager"]},
    {"id": "s5", "name": "Clariant", "country": "Switzerland", "linkedinCompanyUrl": "https://www.linkedin.com/company/clariant/", "targetRoles": ["Business Development Manager"]},
    {"id": "s6", "name": "Evonik", "country": "Germany", "linkedinCompanyUrl": "https://www.linkedin.com/company/evonik/", "targetRoles": ["Account Manager - Care Solutions"]},
    {"id": "s7", "name": "Lubrizol Life Science", "country": "USA", "linkedinCompanyUrl": "https://www.linkedin.com/company/lubrizol/", "targetRoles": ["Sales Director - Personal Care"]},
    {"id": "s8", "name": "Symrise", "country": "Germany", "linkedinCompanyUrl": "https://www.linkedin.com/company/symrise/", "targetRoles": ["Regional Sales Manager"]},
]

ALIAS_TO_CHEMICAL = {}
for chem in TRACKED_CHEMICALS:
    for alias in chem["aliases"]:
        ALIAS_TO_CHEMICAL[alias] = chem["id"]

SKIP_TOKENS = {"view more", "view less", "see all"}


def clean_ingredient_token(token):
    token = token.strip().strip(".")
    return token


def trim_to_full_inci(tokens):
    for i, token in enumerate(tokens):
        cleaned = clean_ingredient_token(token).lower()
        if cleaned in ("aqua", "water"):
            return tokens[i:]
    return tokens


BENEFIT_WORD_RE = re.compile(
    r"\b(helps?|fights?|reduces?|boosts?|tightens?|shrinks?|moisturi[sz]es?|hydrates?|nourishes?|protects?|"
    r"smooth(en)?s?|controls?|prevents?|soothes?|restores?|improves?|locks?|adds?|gives?|provides?|"
    r"deeply|gently|clears?|brightens?|evens?|repairs?|strengthens?|renews?|revitali[sz]es?|calms?|"
    r"balances?|purifies?|unclogs?|cleanses?|reveals?|refreshes?|softens?|glow(s|ing)?)\b",
    re.I,
)


def looks_like_ingredient_name(token):
    t = token.strip()
    if not t:
        return False
    if not re.search(r"[a-zA-Z]", t):
        return False
    if t[:1].islower():
        return False
    if BENEFIT_WORD_RE.search(t):
        return False
    if len(t.split()) > 8:
        return False
    return True


def match_chemicals(ingredients_raw):
    matched_ids = []
    if not ingredients_raw:
        return matched_ids
    for token in ingredients_raw:
        cleaned = clean_ingredient_token(token).lower()
        if cleaned in SKIP_TOKENS:
            continue
        if cleaned in ALIAS_TO_CHEMICAL:
            cid = ALIAS_TO_CHEMICAL[cleaned]
            if cid not in matched_ids:
                matched_ids.append(cid)
    return matched_ids


def load_legal_entities():
    try:
        with open("data/legal_entities.json", encoding="utf-8") as f:
            rows = json.load(f)
    except FileNotFoundError:
        return {}
    return {r["brand_name"]: r for r in rows}


def load_manufacturers():
    try:
        with open("data/manufacturers.json", encoding="utf-8") as f:
            rows = json.load(f)
    except FileNotFoundError:
        return {}
    return {r["brand_name"]: r for r in rows}


def load_flipkart_fallback():
    try:
        with open("data/flipkart_products.json", encoding="utf-8") as f:
            rows = json.load(f)
    except FileNotFoundError:
        return {}
    by_brand = {}
    for row in rows:
        by_brand.setdefault(row["brand_name"], []).append(row)
    return by_brand


def main():
    with open("data/scraped_brands.json", encoding="utf-8") as f:
        scraped = json.load(f)
    legal_entities = load_legal_entities()
    manufacturers = load_manufacturers()
    flipkart_fallback = load_flipkart_fallback()

    brands = []
    products = []
    product_counter = 0

    for b_idx, brand in enumerate(scraped):
        brand_id = f"rb{b_idx + 1}"
        legal = legal_entities.get(brand["brand_name"], {})
        mfg = manufacturers.get(brand["brand_name"], {})
        brands.append(
            {
                "id": brand_id,
                "name": brand["brand_name"],
                "website": brand["website"],
                "linkedinCompanyUrl": brand["linkedin_company_url"],
                "targetRoles": brand["target_roles"],
                "publicContacts": brand["public_contacts"],
                "manufacturer": {
                    "thirdPartyLabel": mfg.get("label"),
                    "thirdPartyValue": mfg.get("value"),
                    "thirdPartySourceUrl": mfg.get("source_url"),
                    "legalEntityName": legal.get("legal_entity"),
                    "legalEntityAddress": legal.get("registered_address"),
                    "legalEntitySourceUrl": legal.get("source_url"),
                },
            }
        )
        brand_products = brand["products"] or flipkart_fallback.get(brand["brand_name"], [])
        for product in brand_products:
            if not product.get("name"):
                continue
            product_counter += 1
            product_id = f"rp{product_counter}"
            ingredients_raw = trim_to_full_inci(product.get("ingredients_raw") or [])
            cleaned_ingredients = [
                clean_ingredient_token(t)
                for t in ingredients_raw
                if clean_ingredient_token(t).lower() not in SKIP_TOKENS and looks_like_ingredient_name(t)
            ]
            products.append(
                {
                    "id": product_id,
                    "name": product["name"].strip(),
                    "brand": brand_id,
                    "url": product["url"],
                    "ingredientsVerified": bool(product.get("ingredients_verified")),
                    "chemicals": match_chemicals(ingredients_raw),
                    "ingredientsRaw": cleaned_ingredients,
                    "image": product.get("image"),
                }
            )

    js = "// Auto-generated by scraper/build_app_data.py from scraper/data/scraped_brands.json\n"
    js += "const CHEMICAL_SOURCE = 'real-india-scrape';\n"
    js += f"const SUPPLIERS = {json.dumps(SUPPLIERS, indent=2)};\n\n"
    js += f"const CHEMICALS = {json.dumps(TRACKED_CHEMICALS, indent=2)};\n\n"
    js += "const OEMS = [];\n\n"
    js += f"const BRANDS = {json.dumps(brands, indent=2, ensure_ascii=False)};\n\n"
    js += f"const PRODUCTS = {json.dumps(products, indent=2, ensure_ascii=False)};\n"

    with open("../data.js", "w", encoding="utf-8") as f:
        f.write(js)

    verified_count = sum(1 for p in products if p["ingredientsVerified"])
    print(f"Wrote ../data.js: {len(brands)} brands, {len(products)} products ({verified_count} with verified INCI).")


if __name__ == "__main__":
    main()
