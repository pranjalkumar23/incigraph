"""
Measures data accuracy instead of just assuming it: pulls a random sample of
products, re-fetches each one's stored URL live right now, re-extracts the
product name/ingredients the same way the original scrape did, and diffs the
fresh result against what's stored in data.js.

This directly answers "is our stored data still correct" rather than relying
on a single unverified scrape. Run periodically (e.g. monthly) to track
accuracy/staleness over time, not just once.

Usage:
    python3 audit_sample.py [sample_size]
"""

import json
import random
import re
import sys

from bs4 import BeautifulSoup

from fetch import get
from flipkart_fallback import extract_flipkart_ingredients, extract_name as flipkart_extract_name, get_soup as flipkart_get_soup
from parse_products import extract_ingredients, extract_product_name

SAMPLE_SIZE_DEFAULT = 100


def load_products():
    with open("../data.js", encoding="utf-8") as f:
        content = f.read()
    m = re.search(r"const PRODUCTS = (\[.*\]);\s*$", content, re.S)
    return json.loads(m.group(1))


def jaccard(a, b):
    sa, sb = set(x.strip().lower() for x in a), set(x.strip().lower() for x in b)
    if not sa and not sb:
        return 1.0
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def refetch_brand_site(url):
    html = get(url)
    if not html:
        return None  # broken/unreachable link
    soup = BeautifulSoup(html, "lxml")
    return {
        "name": extract_product_name(soup),
        "ingredients": extract_ingredients(soup) or [],
    }


def refetch_flipkart(url):
    soup = flipkart_get_soup(url)
    if not soup:
        return None
    return {
        "name": flipkart_extract_name(soup),
        "ingredients": extract_flipkart_ingredients(soup) or [],
    }


def audit_one(product):
    url = product.get("url")
    if not url:
        return {"status": "no_url"}
    refetch = refetch_flipkart(url) if product.get("source") == "flipkart" else refetch_brand_site(url)
    if refetch is None:
        return {"status": "unreachable", "url": url}

    name_match = (refetch["name"] or "").strip().lower() in (product["name"].strip().lower(), "") or (
        product["name"].strip().lower() in (refetch["name"] or "").strip().lower()
    )
    ingredient_similarity = jaccard(refetch["ingredients"], product.get("ingredientsRaw") or [])
    return {
        "status": "ok",
        "name_match": name_match,
        "ingredient_similarity": round(ingredient_similarity, 2),
        "stored_name": product["name"],
        "live_name": refetch["name"],
    }


def main():
    sample_size = int(sys.argv[1]) if len(sys.argv) > 1 else SAMPLE_SIZE_DEFAULT
    products = load_products()
    random.seed(42)
    sample = random.sample(products, min(sample_size, len(products)))

    results = []
    for i, p in enumerate(sample):
        result = audit_one(p)
        result["id"] = p["id"]
        result["source"] = p.get("source")
        results.append(result)
        print(f"[{i + 1}/{len(sample)}] {p['name'][:50]!r} -> {result['status']}"
              + (f" name_match={result.get('name_match')} ingredient_sim={result.get('ingredient_similarity')}" if result["status"] == "ok" else ""))

    unreachable = [r for r in results if r["status"] == "unreachable"]
    ok = [r for r in results if r["status"] == "ok"]
    name_matches = sum(1 for r in ok if r["name_match"])
    avg_similarity = sum(r["ingredient_similarity"] for r in ok) / len(ok) if ok else 0
    exact_ingredient_matches = sum(1 for r in ok if r["ingredient_similarity"] == 1.0)

    report = {
        "sample_size": len(sample),
        "unreachable_count": len(unreachable),
        "unreachable_rate": round(len(unreachable) / len(sample), 3),
        "reachable_count": len(ok),
        "name_match_rate": round(name_matches / len(ok), 3) if ok else None,
        "avg_ingredient_jaccard_similarity": round(avg_similarity, 3),
        "exact_ingredient_match_rate": round(exact_ingredient_matches / len(ok), 3) if ok else None,
    }

    print("\n=== Audit report ===")
    print(json.dumps(report, indent=2))

    with open("data/audit_report.json", "w", encoding="utf-8") as f:
        json.dump({"report": report, "results": results}, f, indent=2, ensure_ascii=False)
    print("\nFull detail written to data/audit_report.json")


if __name__ == "__main__":
    main()
