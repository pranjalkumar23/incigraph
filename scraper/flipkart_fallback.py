import json
import re
import sys
from urllib.parse import quote_plus, urljoin

from bs4 import BeautifulSoup

from fetch import get
from parse_products import extract_image

PRODUCT_LINK_RE = re.compile(r"^/[a-z0-9-]+/p/")
MAX_RESULTS_PER_BRAND = 5
SOFT_ERROR_MARKERS = ("Something went wrong", "Please try again later")


def is_soft_error_page(soup):
    text = soup.get_text(" ", strip=True)
    return any(m in text for m in SOFT_ERROR_MARKERS)


def get_soup(url, attempts=2):
    for _ in range(attempts):
        html = get(url)
        if not html:
            return None
        soup = BeautifulSoup(html, "lxml")
        if not is_soft_error_page(soup):
            return soup
        print(f"  Flipkart returned a soft-error page for {url}, retrying")
    return None


def search_flipkart(brand_name):
    query = f"{brand_name} personal care"
    url = f"https://www.flipkart.com/search?q={quote_plus(query)}"
    soup = get_soup(url)
    if not soup:
        return []
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
    text = re.split(r"\s*-\s*Price in India|\s*-\s*Buy\b", text, maxsplit=1, flags=re.I)[0]
    return text.strip() or None


def name_matches_brand(name, brand_name):
    # Real matches consistently lead with "{Brand} {Product...}" (e.g. "Dabur Babool
    # Ayurvedic Toothpaste"); unrelated products that merely mention the brand name as
    # an ingredient/descriptor (e.g. "Babool" the Ayurvedic herb) put it further into the
    # title (e.g. "NIROVAA Pure Babool Phali Powder"), so restricting the match to the
    # first few words filters those out without needing Flipkart's inconsistent spec table.
    # Requiring every brand word (not just one) also stops a generic "Dabur Toothpaste"
    # result from being misattributed to every Dabur sub-brand ("Dabur Red", "Dabur Herb'l", ...).
    if not name:
        return False
    lead_words = re.findall(r"[a-z0-9']+", name.lower())[:2]
    brand_words = [w for w in re.findall(r"[a-z0-9']+", brand_name.lower()) if len(w) > 2]
    if not brand_words:
        return False
    return all(bw in lead_words for bw in brand_words)


def scrape_product(url, brand_name):
    soup = get_soup(url)
    if not soup:
        return None
    name = extract_name(soup)
    if not name_matches_brand(name, brand_name):
        return None
    ingredients = extract_flipkart_ingredients(soup)
    return {
        "url": url,
        "name": name,
        "ingredients_raw": ingredients or [],
        "ingredients_verified": bool(ingredients),
        "image": extract_image(soup, url),
        "source": "flipkart",
    }


def zero_sku_brand_names():
    with open("data/scraped_brands.json", encoding="utf-8") as f:
        scraped = json.load(f)
    return [b["brand_name"] for b in scraped if not b.get("products")]


def main():
    brand_names = zero_sku_brand_names()

    limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(brand_names)
    brand_names = brand_names[:limit]

    print(f"{len(brand_names)} brand(s) with 0 SKUs from their own site; trying Flipkart as a fallback.\n")

    output = []
    for brand_name in brand_names:
        print(f"Searching Flipkart for {brand_name}")
        links = search_flipkart(brand_name)
        found = 0
        verified = 0
        for link in links:
            product = scrape_product(link, brand_name)
            if product:
                product["brand_name"] = brand_name
                output.append(product)
                found += 1
                verified += int(product["ingredients_verified"])
        print(f"  {found}/{len(links)} candidate(s) matched the brand ({verified} with a verified ingredient list)")

    with open("data/flipkart_products.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nWrote data/flipkart_products.json with {len(output)} products.")


if __name__ == "__main__":
    main()
