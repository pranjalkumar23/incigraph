from sqlalchemy import JSON, Boolean, Column, ForeignKey, String, Table, Text
from sqlalchemy.orm import relationship

from .database import Base

chemical_suppliers = Table(
    "chemical_suppliers",
    Base.metadata,
    Column("chemical_id", String, ForeignKey("chemicals.id"), primary_key=True),
    Column("supplier_id", String, ForeignKey("suppliers.id"), primary_key=True),
)

product_chemicals = Table(
    "product_chemicals",
    Base.metadata,
    Column("product_id", String, ForeignKey("products.id"), primary_key=True),
    Column("chemical_id", String, ForeignKey("chemicals.id"), primary_key=True),
)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    country = Column(String)
    linkedin_company_url = Column(String)
    target_roles = Column(JSON, default=list)

    chemicals = relationship("Chemical", secondary=chemical_suppliers, back_populates="suppliers")


class Chemical(Base):
    __tablename__ = "chemicals"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    inci = Column(String)
    cas = Column(String)
    category = Column(String)
    formula = Column(String)
    mw = Column(String)
    smiles = Column(Text)
    aliases = Column(JSON, default=list)

    suppliers = relationship("Supplier", secondary=chemical_suppliers, back_populates="chemicals")
    products = relationship("Product", secondary=product_chemicals, back_populates="chemicals")


class Brand(Base):
    __tablename__ = "brands"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    website = Column(String)
    linkedin_company_url = Column(String)
    target_roles = Column(JSON, default=list)
    public_contacts = Column(JSON, default=dict)

    manufacturer_third_party_label = Column(String)
    manufacturer_third_party_value = Column(String)
    manufacturer_third_party_source_url = Column(String)
    manufacturer_legal_entity_name = Column(String)
    manufacturer_legal_entity_address = Column(Text)
    manufacturer_legal_entity_source_url = Column(String)

    products = relationship("Product", back_populates="brand")


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    brand_id = Column(String, ForeignKey("brands.id"), nullable=False)
    url = Column(String)
    ingredients_verified = Column(Boolean, default=False)
    ingredients_raw = Column(JSON, default=list)
    image = Column(String)

    brand = relationship("Brand", back_populates="products")
    chemicals = relationship("Chemical", secondary=product_chemicals, back_populates="products")
