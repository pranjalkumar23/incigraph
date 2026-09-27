from urllib.parse import urljoin
from urllib.robotparser import RobotFileParser

_cache = {}

USER_AGENT = "ChemTraceBot/0.1 (+contact: procurement-research@yourcompany.example)"


def allowed(url, user_agent=USER_AGENT):
    from urllib.parse import urlparse

    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    if base not in _cache:
        rp = RobotFileParser()
        rp.set_url(urljoin(base, "/robots.txt"))
        try:
            rp.read()
        except Exception:
            rp = None
        _cache[base] = rp
    rp = _cache[base]
    if rp is None:
        return True
    return rp.can_fetch(user_agent, url)
