import csv
import json
import sys
from urllib.parse import urljoin, urlparse

from fetch import get
from parse_contact import parse_contact_page
from parse_products import find_product_links, parse_product_page
from site_configs import config_for

TARGET_ROLES = [
    "Head of Procurement",
    "R&D Manager",
    "Formulation Scientist",
    "Sourcing Manager",
    "Supply Chain Head",
]


def domain_of(url):
    return urlparse(url).netloc


def scrape_contacts(website, cfg):
    for path in cfg["contact_paths"]:
        html = get(urljoin(website, path))
        if html:
            result = parse_contact_page(html)
            if result["emails"] or result["phones"]:
                return result
    return {"emails": [], "phones": []}


def scrape_products(website, cfg):
    products = []
    for path in cfg["product_list_paths"]:
        seen_links = set()
        for page in range(1, cfg["max_pages"] + 1):
            page_url = urljoin(website, path) if page == 1 else urljoin(website, f"{path}?page={page}")
            html = get(page_url)
            if not html:
                break
            links = find_product_links(html, website, cfg["product_link_pattern"])
            new_links = [l for l in links if l not in seen_links]
            if not new_links:
                break
            seen_links.update(new_links)
            for link in new_links:
                page_html = get(link)
                if not page_html:
                    continue
                products.append(parse_product_page(page_html, link))
        if products:
            break
    return products


def main():
    with open("seed_brands.csv", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(rows)
    max_pages_override = int(sys.argv[2]) if len(sys.argv) > 2 else None
    rows = rows[:limit]

    output = []
    for row in rows:
        brand_name = row["brand_name"]
        website = row["website"]
        cfg = config_for(domain_of(website))
        if max_pages_override is not None:
            cfg["max_pages"] = max_pages_override
        print(f"Scraping {brand_name} ({website})")

        contacts = scrape_contacts(website, cfg)
        products = scrape_products(website, cfg)

        output.append(
            {
                "brand_name": brand_name,
                "website": website,
                "linkedin_company_url": row["linkedin_company_url"],
                "target_roles": TARGET_ROLES,
                "public_contacts": contacts,
                "products": products,
            }
        )

    with open("data/scraped_brands.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nWrote data/scraped_brands.json with {len(output)} brands.")


if __name__ == "__main__":
    main()
