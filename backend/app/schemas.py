from typing import Optional

from pydantic import BaseModel, ConfigDict


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    country: Optional[str] = None
    linkedin_company_url: Optional[str] = None
    target_roles: list[str] = []


class ChemicalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    inci: Optional[str] = None
    cas: Optional[str] = None
    category: Optional[str] = None
    formula: Optional[str] = None
    mw: Optional[str] = None
    smiles: Optional[str] = None
    aliases: list[str] = []


class BrandOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    website: Optional[str] = None
    linkedin_company_url: Optional[str] = None


class BrandDetailOut(BrandOut):
    target_roles: list[str] = []
    public_contacts: dict = {}
    manufacturer_third_party_label: Optional[str] = None
    manufacturer_third_party_value: Optional[str] = None
    manufacturer_third_party_source_url: Optional[str] = None
    manufacturer_legal_entity_name: Optional[str] = None
    manufacturer_legal_entity_address: Optional[str] = None
    manufacturer_legal_entity_source_url: Optional[str] = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    brand_id: str
    url: Optional[str] = None
    ingredients_verified: bool = False
    image: Optional[str] = None
    source: str = "brand-site"


class ProductDetailOut(ProductOut):
    ingredients_raw: list[str] = []


class PagedResponse(BaseModel):
    total: int
    items: list


class SearchResultItem(BaseModel):
    type: str
    id: str
    name: str
    sub: Optional[str] = None
