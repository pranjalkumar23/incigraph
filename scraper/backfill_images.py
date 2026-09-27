import json

from bs4 import BeautifulSoup

from fetch import get
from parse_products import extract_image


def main():
    with open("data/scraped_brands.json", encoding="utf-8") as f:
        data = json.load(f)

    total = sum(len(b["products"]) for b in data)
    done = 0
    found = 0

    for brand in data:
        for product in brand["products"]:
            done += 1
            url = product.get("url")
            if not url:
                continue
            html = get(url)
            if not html:
                continue
            soup = BeautifulSoup(html, "lxml")
            image = extract_image(soup, url)
            if image:
                product["image"] = image
                found += 1
            if done % 20 == 0:
                print(f"{done}/{total} processed, {found} images found so far")

    with open("data/scraped_brands.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Done. {found}/{total} products got an image.")


if __name__ == "__main__":
    main()
