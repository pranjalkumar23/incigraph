from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="InciGraph API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the real frontend origin(s) once that's deployed
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    return {
        "chemicals": db.query(func.count(models.Chemical.id)).scalar(),
        "brands": db.query(func.count(models.Brand.id)).scalar(),
        "products": db.query(func.count(models.Product.id)).scalar(),
        "suppliers": db.query(func.count(models.Supplier.id)).scalar(),
    }


# ---- Brands ----


@app.get("/api/brands", response_model=schemas.PagedResponse)
def list_brands(q: str | None = None, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    query = db.query(models.Brand)
    if q:
        query = query.filter(models.Brand.name.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(models.Brand.name).offset(offset).limit(limit).all()
    return {"total": total, "items": [schemas.BrandOut.model_validate(b) for b in items]}


@app.get("/api/brands/{brand_id}", response_model=schemas.BrandDetailOut)
def get_brand(brand_id: str, db: Session = Depends(get_db)):
    brand = db.get(models.Brand, brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


@app.get("/api/brands/{brand_id}/products", response_model=schemas.PagedResponse)
def brand_products(brand_id: str, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    query = db.query(models.Product).filter(models.Product.brand_id == brand_id)
    total = query.count()
    items = query.order_by(models.Product.name).offset(offset).limit(limit).all()
    return {"total": total, "items": [schemas.ProductOut.model_validate(p) for p in items]}


@app.get("/api/brands/{brand_id}/chemicals", response_model=schemas.PagedResponse)
def brand_chemicals(brand_id: str, db: Session = Depends(get_db)):
    chemicals = (
        db.query(models.Chemical)
        .join(models.product_chemicals)
        .join(models.Product)
        .filter(models.Product.brand_id == brand_id)
        .distinct()
        .all()
    )
    return {"total": len(chemicals), "items": [schemas.ChemicalOut.model_validate(c) for c in chemicals]}


# ---- Chemicals ----


@app.get("/api/chemicals", response_model=schemas.PagedResponse)
def list_chemicals(q: str | None = None, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    query = db.query(models.Chemical)
    if q:
        query = query.filter(models.Chemical.name.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(models.Chemical.name).offset(offset).limit(limit).all()
    return {"total": total, "items": [schemas.ChemicalOut.model_validate(c) for c in items]}


@app.get("/api/chemicals/{chemical_id}", response_model=schemas.ChemicalOut)
def get_chemical(chemical_id: str, db: Session = Depends(get_db)):
    chemical = db.get(models.Chemical, chemical_id)
    if not chemical:
        raise HTTPException(status_code=404, detail="Chemical not found")
    return chemical


@app.get("/api/chemicals/{chemical_id}/products", response_model=schemas.PagedResponse)
def chemical_products(chemical_id: str, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    query = db.query(models.Product).join(models.product_chemicals).filter(
        models.product_chemicals.c.chemical_id == chemical_id
    )
    total = query.count()
    items = query.order_by(models.Product.name).offset(offset).limit(limit).all()
    return {"total": total, "items": [schemas.ProductOut.model_validate(p) for p in items]}


@app.get("/api/chemicals/{chemical_id}/brands", response_model=schemas.PagedResponse)
def chemical_brands(chemical_id: str, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    # The textbook "consumption" example: a chemical manufacturer asking how many (and
    # which) brands use their chemical. `total` is always the real count — Phase 2's
    # plan-based limiting should cap `items`, never lie about `total`.
    query = (
        db.query(models.Brand)
        .join(models.Product)
        .join(models.product_chemicals)
        .filter(models.product_chemicals.c.chemical_id == chemical_id)
        .distinct()
    )
    total = query.count()
    items = query.order_by(models.Brand.name).offset(offset).limit(limit).all()
    return {"total": total, "items": [schemas.BrandOut.model_validate(b) for b in items]}


@app.get("/api/chemicals/{chemical_id}/suppliers", response_model=schemas.PagedResponse)
def chemical_suppliers(chemical_id: str, db: Session = Depends(get_db)):
    chemical = db.get(models.Chemical, chemical_id)
    if not chemical:
        raise HTTPException(status_code=404, detail="Chemical not found")
    return {"total": len(chemical.suppliers), "items": [schemas.SupplierOut.model_validate(s) for s in chemical.suppliers]}


# ---- Products ----


@app.get("/api/products", response_model=schemas.PagedResponse)
def list_products(q: str | None = None, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    query = db.query(models.Product)
    if q:
        query = query.filter(models.Product.name.ilike(f"%{q}%"))
    total = query.count()
    items = query.order_by(models.Product.name).offset(offset).limit(limit).all()
    return {"total": total, "items": [schemas.ProductOut.model_validate(p) for p in items]}


@app.get("/api/products/{product_id}", response_model=schemas.ProductDetailOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.get("/api/products/{product_id}/chemicals", response_model=schemas.PagedResponse)
def product_chemicals_endpoint(product_id: str, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"total": len(product.chemicals), "items": [schemas.ChemicalOut.model_validate(c) for c in product.chemicals]}


# ---- Suppliers ----


@app.get("/api/suppliers", response_model=schemas.PagedResponse)
def list_suppliers(db: Session = Depends(get_db)):
    items = db.query(models.Supplier).order_by(models.Supplier.name).all()
    return {"total": len(items), "items": [schemas.SupplierOut.model_validate(s) for s in items]}


@app.get("/api/suppliers/{supplier_id}", response_model=schemas.SupplierOut)
def get_supplier(supplier_id: str, db: Session = Depends(get_db)):
    supplier = db.get(models.Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@app.get("/api/suppliers/{supplier_id}/chemicals", response_model=schemas.PagedResponse)
def supplier_chemicals(supplier_id: str, db: Session = Depends(get_db)):
    supplier = db.get(models.Supplier, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"total": len(supplier.chemicals), "items": [schemas.ChemicalOut.model_validate(c) for c in supplier.chemicals]}


# ---- Search ----


@app.get("/api/search", response_model=list[schemas.SearchResultItem])
def search(q: str, type: str = "all", limit: int = 30, db: Session = Depends(get_db)):
    results: list[schemas.SearchResultItem] = []
    like = f"%{q}%"

    if type in ("all", "chemical"):
        for c in db.query(models.Chemical).filter(
            or_(models.Chemical.name.ilike(like), models.Chemical.inci.ilike(like), models.Chemical.cas.ilike(like))
        ):
            results.append(schemas.SearchResultItem(type="chemical", id=c.id, name=c.name, sub=f"{c.category} · CAS {c.cas}"))

    if type in ("all", "brand"):
        for b in db.query(models.Brand).filter(models.Brand.name.ilike(like)):
            count = db.query(func.count(models.Product.id)).filter(models.Product.brand_id == b.id).scalar()
            results.append(schemas.SearchResultItem(type="brand", id=b.id, name=b.name, sub=f"{count} products tracked"))

    if type in ("all", "product"):
        for p in db.query(models.Product).filter(models.Product.name.ilike(like)).limit(limit):
            results.append(schemas.SearchResultItem(type="product", id=p.id, name=p.name, sub=p.brand.name if p.brand else None))

    if type in ("all", "supplier"):
        for s in db.query(models.Supplier).filter(models.Supplier.name.ilike(like)):
            results.append(schemas.SearchResultItem(type="supplier", id=s.id, name=s.name, sub=s.country))

    return results[:limit]
