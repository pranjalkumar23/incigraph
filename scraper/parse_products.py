import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

INGREDIENT_HEADING_RE = re.compile(r"ingredients|inci|composition", re.I)


def find_product_links(html, base_url, link_pattern):
    soup = BeautifulSoup(html, "lxml")
    links = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if link_pattern in href:
            full = urljoin(base_url, href)
            if full not in seen:
                seen.add(full)
                links.append(full)
    return links


def extract_product_name(soup):
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)
    if soup.title:
        return soup.title.get_text(strip=True)
    return None


def extract_ingredients(soup):
    for tag in soup.find_all(["h2", "h3", "h4", "summary", "button", "strong"]):
        text = tag.get_text(strip=True)
        if INGREDIENT_HEADING_RE.search(text) and len(text) < 60:
            sibling = tag.find_next(["p", "div", "ul"])
            if sibling:
                raw = sibling.get_text(separator=",", strip=True)
                if raw:
                    return [i.strip() for i in raw.split(",") if i.strip()]
    return None


def looks_like_full_inci(ingredients):
    if not ingredients or len(ingredients) < 8:
        return False
    return any(i.strip().lower() in ("aqua", "water") for i in ingredients)


def extract_image(soup, base_url):
    og = soup.find("meta", property="og:image")
    if og and og.get("content"):
        return urljoin(base_url, og["content"])
    twitter = soup.find("meta", attrs={"name": "twitter:image"})
    if twitter and twitter.get("content"):
        return urljoin(base_url, twitter["content"])
    return None


def parse_product_page(html, url):
    soup = BeautifulSoup(html, "lxml")
    ingredients = extract_ingredients(soup)
    return {
        "url": url,
        "name": extract_product_name(soup),
        "ingredients_raw": ingredients,
        "ingredients_verified": looks_like_full_inci(ingredients),
        "image": extract_image(soup, url),
    }
