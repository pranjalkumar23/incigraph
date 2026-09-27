import time
import requests

from robots import allowed, USER_AGENT

DELAY_SECONDS = 2.0
TIMEOUT = 15


def get(url):
    if not allowed(url):
        print(f"  skip (robots.txt disallows): {url}")
        return None
    time.sleep(DELAY_SECONDS)
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT)
        if resp.status_code != 200:
            print(f"  skip (status {resp.status_code}): {url}")
            return None
        return resp.text
    except requests.RequestException as e:
        print(f"  skip (error {e}): {url}")
        return None
