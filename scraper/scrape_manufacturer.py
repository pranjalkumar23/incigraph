import csv
import json
import sys

from bs4 import BeautifulSoup

from fetch import get
from flipkart_fallback import search_flipkart

LABEL_PRIORITY = [
    "Name and address of the Manufacturer",
    "Name and address of the Packer",
    "Name and address of the Importer",
]


def extract_manufacturer(soup):
    for label in LABEL_PRIORITY:
        for tag in soup.find_all(True):
            if tag.get_text(strip=True) == label:
                nxt = tag.find_next_sibling()
                if nxt:
                    value = nxt.get_text(strip=True)
                    if value:
                        return {"label": label, "value": value}
    return None


def find_manufacturer_for_brand(brand_name, max_candidates=5):
    links = search_flipkart(brand_name)
    for link in links[:max_candidates]:
        html = get(link)
        if not html:
            continue
        soup = BeautifulSoup(html, "lxml")
        result = extract_manufacturer(soup)
        if result:
            result["source_url"] = link
            return result
    return None


def main():
    with open("seed_brands.csv", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(rows)
    rows = rows[:limit]

    output = []
    for row in rows:
        brand_name = row["brand_name"]
        print(f"Looking up manufacturer for {brand_name}")
        result = find_manufacturer_for_brand(brand_name)
        entry = {"brand_name": brand_name}
        if result:
            entry.update(result)
            print(f"  -> [{result['label']}] {result['value'][:80]}")
        else:
            entry.update({"label": None, "value": None, "source_url": None})
            print("  -> not found")
        output.append(entry)

    with open("data/manufacturers.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    found = sum(1 for r in output if r["value"])
    print(f"\nWrote data/manufacturers.json: {found}/{len(output)} brands with a manufacturer found.")


if __name__ == "__main__":
    main()
