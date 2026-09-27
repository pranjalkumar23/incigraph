import csv
import json
import re
import sys
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from fetch import get

LEGAL_PATHS = [
    "/policies/terms-of-service",
    "/pages/terms-of-service",
    "/pages/terms",
    "/terms-of-service",
    "/terms",
    "/policies/privacy-policy",
    "/pages/privacy-policy",
    "/privacy-policy",
    "/pages/legal",
    "/pages/about-us",
    "/about-us",
]

COMPANY_RE = re.compile(
    r"\b([A-Z][\w&.'-]*(?:\s+[A-Za-z0-9(][\w&.'()-]*){0,6}\s+(?:Private Limited|Pvt\.? Ltd\.?|LLP|Limited))\b"
)
LEGAL_SUFFIXES = {"private limited", "pvt ltd", "pvt. ltd.", "llp", "limited"}
NAV_STOPWORDS = {"about", "us", "button", "menu", "home", "contact", "click", "search", "cart", "login", "skip", "navigation", "toggle"}
ADDRESS_HINT_RE = re.compile(r"[Rr]egistered\s+(?:[Oo]ffice|[Aa]ddress)\s*[:\-]?\s*(.{10,100})")
ADDRESS_STOP_RE = re.compile(r"(toll[ -]free|copyright|phone|email|customer service|[+]?\d{2,4}[- ]?\d{6,})", re.I)


def clean_company_candidate(candidate):
    tokens = candidate.split()
    last_stop = -1
    for i, t in enumerate(tokens):
        if t.lower().strip(".,()") in NAV_STOPWORDS:
            last_stop = i
    if last_stop >= 0:
        tokens = tokens[last_stop + 1 :]
    return " ".join(tokens)


def extract_legal_entity(html):
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(" ", strip=True)
    company = None
    for m in COMPANY_RE.finditer(text):
        candidate = clean_company_candidate(m.group(1).strip())
        if len(candidate.split()) >= 3 and candidate.lower() not in LEGAL_SUFFIXES:
            company = candidate
            break
    address = None
    addr_match = ADDRESS_HINT_RE.search(text)
    if addr_match:
        address = addr_match.group(1).strip().rstrip(".")
        stop = ADDRESS_STOP_RE.search(address)
        if stop:
            address = address[: stop.start()].strip().rstrip(",")
    return company, address


def find_legal_entity(website):
    for path in LEGAL_PATHS:
        html = get(urljoin(website, path))
        if not html:
            continue
        company, address = extract_legal_entity(html)
        if company:
            return {"legal_entity": company, "registered_address": address, "source_url": urljoin(website, path)}
    return {"legal_entity": None, "registered_address": None, "source_url": None}


def main():
    with open("seed_brands.csv", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(rows)
    rows = rows[:limit]

    output = []
    for row in rows:
        brand_name = row["brand_name"]
        website = row["website"]
        print(f"Checking legal entity for {brand_name}")
        result = find_legal_entity(website)
        result["brand_name"] = brand_name
        output.append(result)
        status = result["legal_entity"] or "not found"
        print(f"  -> {status}")

    with open("data/legal_entities.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    found = sum(1 for r in output if r["legal_entity"])
    print(f"\nWrote data/legal_entities.json: {found}/{len(output)} brands with a legal entity found.")


if __name__ == "__main__":
    main()
