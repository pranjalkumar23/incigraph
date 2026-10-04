import time
import requests

from robots import allowed, USER_AGENT

DELAY_SECONDS = 2.0
TIMEOUT = 15


def get(url, attempts=2):
    if not allowed(url):
        print(f"  skip (robots.txt disallows): {url}")
        return None
    for attempt in range(attempts):
        time.sleep(DELAY_SECONDS)
        try:
            resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT)
            if resp.status_code != 200:
                print(f"  skip (status {resp.status_code}): {url}")
                return None
            return resp.text
        except requests.RequestException as e:
            # Network-level errors (DNS hiccup, timeout, connection reset) are often
            # transient, unlike a real HTTP status — worth one retry before giving up,
            # so a momentary blip doesn't get misreported as a dead/stale link.
            if attempt < attempts - 1:
                print(f"  retrying after error ({e}): {url}")
                continue
            print(f"  skip (error {e}): {url}")
            return None
