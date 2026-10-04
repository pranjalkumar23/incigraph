"""
Tries to verify stored ingredients against the actual product image via OCR —
the closest thing to the legally-binding printed label, when the image happens
to show it. Most stored `image` values are front-of-pack marketing shots, not
the ingredients panel (usually on the back/side), so this is expected to have
limited hit-rate with the current image data. That limitation is itself the
finding: a future scraper enhancement would need to specifically capture an
ingredients-panel photo (often a secondary product image) for this to be a
reliable verification method.

Usage:
    python3 ocr_audit.py [sample_size]
"""

import io
import json
import random
import re
import sys

import pytesseract
import requests
from PIL import Image

SAMPLE_SIZE_DEFAULT = 60
INGREDIENT_MARKER_RE = re.compile(r"ingredients|inci|composition", re.I)


def load_products():
    with open("../data.js", encoding="utf-8") as f:
        content = f.read()
    m = re.search(r"const PRODUCTS = (\[.*\]);\s*$", content, re.S)
    return json.loads(m.group(1))


def ocr_image(url):
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code != 200:
            return None
        img = Image.open(io.BytesIO(resp.content))
        return pytesseract.image_to_string(img)
    except Exception as e:
        return f"__error__:{e}"


def token_overlap(ocr_text, stored_ingredients):
    ocr_lower = ocr_text.lower()
    if not stored_ingredients:
        return None
    hits = sum(1 for i in stored_ingredients if i.strip().lower() in ocr_lower)
    return hits / len(stored_ingredients)


def main():
    sample_size = int(sys.argv[1]) if len(sys.argv) > 1 else SAMPLE_SIZE_DEFAULT
    products = [p for p in load_products() if p.get("image") and p.get("ingredientsRaw")]
    random.seed(7)
    sample = random.sample(products, min(sample_size, len(products)))

    results = []
    for i, p in enumerate(sample):
        text = ocr_image(p["image"])
        if text is None:
            status = "image_unreachable"
            overlap = None
            has_ingredient_marker = False
        elif isinstance(text, str) and text.startswith("__error__"):
            status = "ocr_error"
            overlap = None
            has_ingredient_marker = False
        else:
            status = "ok"
            has_ingredient_marker = bool(INGREDIENT_MARKER_RE.search(text))
            overlap = token_overlap(text, p["ingredientsRaw"])
        results.append({
            "id": p["id"],
            "name": p["name"],
            "status": status,
            "has_ingredient_marker_in_image": has_ingredient_marker,
            "token_overlap": round(overlap, 2) if overlap is not None else None,
        })
        print(f"[{i + 1}/{len(sample)}] {p['name'][:50]!r} -> {status}"
              + (f" marker={has_ingredient_marker} overlap={overlap}" if status == "ok" else ""))

    ok = [r for r in results if r["status"] == "ok"]
    with_marker = [r for r in ok if r["has_ingredient_marker_in_image"]]
    report = {
        "sample_size": len(sample),
        "image_unreachable": sum(1 for r in results if r["status"] == "image_unreachable"),
        "ocr_errors": sum(1 for r in results if r["status"] == "ocr_error"),
        "ocr_ok": len(ok),
        "images_showing_ingredient_panel": len(with_marker),
        "images_showing_ingredient_panel_rate": round(len(with_marker) / len(ok), 3) if ok else None,
        "avg_token_overlap_when_panel_visible": (
            round(sum(r["token_overlap"] for r in with_marker if r["token_overlap"] is not None) / len(with_marker), 3)
            if with_marker else None
        ),
    }

    print("\n=== OCR audit report ===")
    print(json.dumps(report, indent=2))

    with open("data/ocr_audit_report.json", "w", encoding="utf-8") as f:
        json.dump({"report": report, "results": results}, f, indent=2, ensure_ascii=False)
    print("\nFull detail written to data/ocr_audit_report.json")


if __name__ == "__main__":
    main()
