# api/app/api/endpoints/products.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any, Optional

from app import crud
from app.models.user import User as UserModel
from app.schemas.product import Product as ProductSchema, ProductCreate, ProductUpdate
from app.schemas.category import ProductCategory as CategorySchema
from app.schemas.supplier import Supplier as SupplierSchema
from app.schemas.stock import StockAdjustment
from app.api.dependencies import get_db, RoleChecker, get_current_active_user
from app.schemas.enums import UserRole
from app.services.stock_service import stock_service
from app.db.session import AsyncSessionLocal
from loguru import logger

router = APIRouter()

manager_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER])

@router.post("/", response_model=ProductSchema, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_permissions)], summary="Criar um novo produto")
async def create_product( *, db: AsyncSession = Depends(get_db), product_in: ProductCreate, current_user: UserModel = Depends(get_current_active_user) ) -> Any:
    return await crud.product.create(db=db, obj_in=product_in, current_user=current_user)

@router.get("/", response_model=List[ProductSchema], summary="Listar produtos da loja")
async def read_products(
    *,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    supplier_id: Optional[int] = Query(None),
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    return await crud.product.get_multi(
        db, skip=skip, limit=limit, current_user=current_user,
        search=search, category_id=category_id, supplier_id=supplier_id
    )

# --- CORREÇÃO: Endpoint Lookup Adicionado ANTES do ID ---
@router.get("/lookup", response_model=List[ProductSchema], summary="Busca rápida (POS)")
async def lookup_product(
    q: str = Query(..., description="Termo de busca (nome ou código de barras)"),
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """ Endpoint dedicado para busca exata ou aproximada no PDV. """
    # Reutiliza a lógica de busca do get_multi, mapeando 'q' para 'search'
    return await crud.product.get_multi(db, search=q, limit=10, current_user=current_user)
# -------------------------------------------------------

@router.get("/{product_id}", response_model=ProductSchema, summary="Obter um produto por ID")
async def read_product( *, db: AsyncSession = Depends(get_db), product_id: int, current_user: UserModel = Depends(get_current_active_user) ) -> Any:
    product = await crud.product.get(db, id=product_id, current_user=current_user)
    if not product:
        raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado." )
    return product

@router.put("/{product_id}", response_model=ProductSchema, dependencies=[Depends(manager_permissions)], summary="Atualizar um produto")
async def update_product( *, db: AsyncSession = Depends(get_db), product_id: int, product_in: ProductUpdate, current_user: UserModel = Depends(get_current_active_user) ) -> Any:
    db_product = await crud.product.get(db, id=product_id, current_user=current_user)
    if not db_product:
        raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado." )
    return await crud.product.update(db=db, db_obj=db_product, obj_in=product_in, current_user=current_user)

@router.delete("/{product_id}", response_model=ProductSchema, dependencies=[Depends(manager_permissions)], summary="Deletar um produto")
async def delete_product( *, db: AsyncSession = Depends(get_db), product_id: int, current_user: UserModel = Depends(get_current_active_user) ) -> Any:
    product_to_delete = await crud.product.get(db, id=product_id, current_user=current_user)
    if not product_to_delete:
         raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado." )
    deleted_product = await crud.product.remove(db=db, id=product_id, current_user=current_user)
    return deleted_product

@router.post("/{product_id}/stock-adjustment", status_code=status.HTTP_200_OK, dependencies=[Depends(manager_permissions)], summary="Ajustar o estoque de um produto")
async def adjust_product_stock(
    *,
    db: AsyncSession = Depends(get_db),
    product_id: int,
    adjustment_in: StockAdjustment,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    product_to_adjust = await crud.product.get(db, id=product_id, current_user=current_user)
    if not product_to_adjust:
        raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado." )

    try:
        from app.models.stock_movement import StockMovement, MovementType
        quantity_change = adjustment_in.new_stock_level - (product_to_adjust.stock or 0)
        product_to_adjust.stock = adjustment_in.new_stock_level

        movement = StockMovement(
            product_id=product_id,
            user_id=current_user.id,
            movement_type=MovementType.ADJUSTMENT,
            quantity=quantity_change,
            stock_after_movement=product_to_adjust.stock,
            reason=adjustment_in.reason,
            store_id=product_to_adjust.store_id
        )
        db.add(product_to_adjust)
        db.add(movement)

        if product_to_adjust.stock <= (product_to_adjust.low_stock_threshold or 0):
            logger.warning( f"Estoque baixo para o produto ID {product_id}." )

        await db.commit()
        await db.refresh(movement)

    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao ajustar estoque: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao ajustar estoque.")

    return {"message": "Estoque ajustado com sucesso.", "new_stock_level": movement.stock_after_movement}

@router.get("/lookups/categories", response_model=List[CategorySchema], summary="Listar categorias para selects")
async def list_categories(db: AsyncSession = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    return await crud.category.get_multi(db=db, current_user=current_user)

@router.get("/lookups/suppliers", response_model=List[SupplierSchema], summary="Listar fornecedores para selects")
async def list_suppliers(db: AsyncSession = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    return await crud.supplier.get_multi(db=db, current_user=current_user)