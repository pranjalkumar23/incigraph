DEFAULT_CONFIG = {
    "product_list_paths": ["/collections/all", "/shop", "/products"],
    "product_link_pattern": "/products/",
    "contact_paths": ["/pages/contact-us", "/contact-us", "/contact", "/pages/contact"],
    "max_pages": 25,
}

SITE_OVERRIDES = {
    "www.mamaearth.in": {
        "product_list_paths": ["/collections/all-products"],
        "contact_paths": ["/pages/contact-us"],
    },
    "www.plumgoodness.com": {
        "product_list_paths": ["/collections/all"],
        "contact_paths": ["/pages/contact-us"],
    },
    "beminimalist.co": {
        "product_list_paths": ["/collections/all"],
        "contact_paths": ["/pages/contact-us"],
    },
}


def config_for(domain):
    cfg = dict(DEFAULT_CONFIG)
    cfg.update(SITE_OVERRIDES.get(domain, {}))
    return cfg
