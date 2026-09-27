import csv
import json
import re
import sys
from urllib.parse import quote_plus, urljoin

from bs4 import BeautifulSoup

from fetch import get
from parse_products import extract_image

PRODUCT_LINK_RE = re.compile(r"^/[a-z0-9-]+/p/")
MAX_RESULTS_PER_BRAND = 5


def search_flipkart(brand_name):
    query = f"{brand_name} personal care"
    url = f"https://www.flipkart.com/search?q={quote_plus(query)}"
    html = get(url)
    if not html:
        return []
    soup = BeautifulSoup(html, "lxml")
    links = []
    seen = set()
    brand_token = re.sub(r"[^a-z0-9]", "", brand_name.lower().split()[0])
    for a in soup.find_all("a", href=True):
        path = a["href"].split("?")[0]
        if PRODUCT_LINK_RE.match(path):
            full = urljoin(url, a["href"])
            if full in seen:
                continue
            slug = re.sub(r"[^a-z0-9]", "", path.lower())
            if brand_token and brand_token not in slug:
                continue
            seen.add(full)
            links.append(full)
        if len(links) >= MAX_RESULTS_PER_BRAND:
            break
    return links


def extract_flipkart_ingredients(soup):
    candidates = []
    for tag in soup.find_all(["div", "p"]):
        text = tag.get_text(separator=",", strip=True)
        if not text or "," not in text:
            continue
        parts = [p.strip() for p in text.split(",") if p.strip()]
        if len(parts) >= 8 and any(p.lower() in ("aqua", "water") for p in parts[:3]):
            candidates.append(parts)
    if not candidates:
        return None
    return max(candidates, key=len)


def extract_name(soup):
    title_tag = soup.find("title")
    if not title_tag:
        return None
    text = title_tag.get_text(strip=True)
    text = text.split(" | ")[0]
    text = re.sub(r"\s*-\s*Buy.*$", "", text, flags=re.I)
    return text.strip() or None


def scrape_product(url):
    html = get(url)
    if not html:
        return None
    soup = BeautifulSoup(html, "lxml")
    ingredients = extract_flipkart_ingredients(soup)
    if not ingredients:
        return None
    return {
        "url": url,
        "name": extract_name(soup),
        "ingredients_raw": ingredients,
        "ingredients_verified": True,
        "image": extract_image(soup, url),
        "source": "flipkart",
    }


def main():
    with open("seed_brands.csv", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(rows)
    rows = rows[:limit]

    output = []
    for row in rows:
        brand_name = row["brand_name"]
        print(f"Searching Flipkart for {brand_name}")
        links = search_flipkart(brand_name)
        found = 0
        for link in links:
            product = scrape_product(link)
            if product:
                product["brand_name"] = brand_name
                output.append(product)
                found += 1
        print(f"  {found}/{len(links)} candidate(s) had a usable ingredient list")

    with open("data/flipkart_products.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nWrote data/flipkart_products.json with {len(output)} products.")


if __name__ == "__main__":
    main()
