import re
from bs4 import BeautifulSoup

EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_RE = re.compile(r"(?:\+91[\s-]?)?[6-9]\d{9}")


def parse_contact_page(html):
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(" ", strip=True)
    emails = sorted(set(EMAIL_RE.findall(text)))
    phones = sorted(set(PHONE_RE.findall(text)))
    emails = [e for e in emails if not e.lower().endswith((".png", ".jpg", ".svg"))]
    return {"emails": emails, "phones": phones}
