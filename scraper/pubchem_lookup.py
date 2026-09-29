import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter

DELAY_SECONDS = 0.3
CACHE_FILE = "data/pubchem_cache.json"
USER_AGENT = "InciGraphResearchBot/0.1 (+contact: procurement-research@yourcompany.example)"

CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")


def load_cache():
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_cache(cache):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


def fetch_json(url, attempts=3):
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (429, 503) and attempt < attempts - 1:
                time.sleep(2 * (attempt + 1))
                continue
            return None
        except Exception:
            if attempt < attempts - 1:
                time.sleep(1)
                continue
            return None
    return None


def lookup_cas(name):
    url = (
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"
        + urllib.parse.quote(name, safe="")
        + "/synonyms/JSON"
    )
    data = fetch_json(url)
    if not data:
        return None
    synonyms = data.get("InformationList", {}).get("Information", [{}])[0].get("Synonym", [])
    for s in synonyms:
        if CAS_RE.match(s.strip()):
            return s.strip()
    return None


def lookup_pubchem(name):
    url = (
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"
        + urllib.parse.quote(name, safe="")
        + "/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName/JSON"
    )
    data = fetch_json(url)
    if not data:
        return None
    props = data.get("PropertyTable", {}).get("Properties", [])
    if not props:
        return None
    p = props[0]
    result = {
        "cid": p.get("CID"),
        "formula": p.get("MolecularFormula"),
        "mw": p.get("MolecularWeight"),
        "smiles": p.get("ConnectivitySMILES") or p.get("CanonicalSMILES"),
        "iupac": p.get("IUPACName"),
    }
    time.sleep(DELAY_SECONDS)
    result["cas"] = lookup_cas(name)
    return result


def extract_ingredient_names():
    content = open("../data.js", encoding="utf-8").read()
    m = re.search(r"const PRODUCTS = (\[.*\]);\s*$", content, re.S)
    products = json.loads(m.group(1))
    counts = Counter()
    display = {}
    for p in products:
        for tok in p.get("ingredientsRaw", []):
            key = tok.strip().lower()
            if not key:
                continue
            counts[key] += 1
            display.setdefault(key, tok.strip())
    return counts, display


def main():
    counts, display = extract_ingredient_names()
    ordered = [k for k, _ in counts.most_common()]

    limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(ordered)
    ordered = ordered[:limit]

    cache = load_cache()
    total = len(ordered)
    resolved = sum(1 for k in ordered if cache.get(k))
    todo = [k for k in ordered if k not in cache]
    print(f"{len(todo)} name(s) left to look up ({total - len(todo)} already cached, {resolved} resolved so far)\n")

    for i, key in enumerate(todo):
        name = display.get(key, key)
        result = lookup_pubchem(name)
        cache[key] = result
        if result:
            resolved += 1
        if (i + 1) % 50 == 0:
            save_cache(cache)
            print(f"{i + 1}/{len(todo)} processed this run, {resolved} resolved total so far")
        time.sleep(DELAY_SECONDS)

    save_cache(cache)
    print(f"\nDone. {resolved} resolved out of {total} total. Cache: {CACHE_FILE}")


if __name__ == "__main__":
    main()
