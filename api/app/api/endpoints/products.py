# api/app/api/endpoints/products.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any, Optional

from app import crud
from app.models.user import User as UserModel
from app.schemas.product import Product as ProductSchema, ProductCreate, ProductUpdate
# --- CORREÇÃO: Import schemas directly ---
from app.schemas.category import ProductCategory as CategorySchema # Import ProductCategory and alias it
from app.schemas.supplier import Supplier as SupplierSchema # Import Supplier schema
# --- FIM CORREÇÃO ---
from app.schemas.stock import StockAdjustment
from app.api.dependencies import get_db, RoleChecker, get_current_active_user
from app.schemas.enums import UserRole
# Importar stock_service de forma síncrona (ajustaremos a chamada)
from app.services.stock_service import stock_service
from app.db.session import AsyncSessionLocal # Para run_sync se necessário
from loguru import logger # Import logger if not already imported

router = APIRouter()

manager_permissions = RoleChecker([UserRole.ADMIN, UserRole.MANAGER])

# --- Rota POST / (create_product) --- sem alterações ---
@router.post( "/", response_model=ProductSchema, status_code=status.HTTP_201_CREATED, dependencies=[Depends(manager_permissions)], summary="Criar um novo produto" )
async def create_product( *, db: AsyncSession = Depends(get_db), product_in: ProductCreate, current_user: UserModel = Depends(get_current_active_user) ) -> Any:
    """ Cria um novo produto na loja do usuário autenticado. """
    return await crud.product.create(db=db, obj_in=product_in, current_user=current_user)


# --- Rota GET / (read_products) --- sem alterações ---
@router.get("/", response_model=List[ProductSchema], summary="Listar produtos da loja")
async def read_products(
    *,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Filtrar produtos pelo nome"),
    category_id: Optional[int] = Query(None, description="Filtrar por ID da categoria principal"),
    supplier_id: Optional[int] = Query(None, description="Filtrar por ID do fornecedor"),
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """ Retorna uma lista de produtos da loja, com opção de busca e filtros. """
    return await crud.product.get_multi(
        db, skip=skip, limit=limit, current_user=current_user,
        search=search, category_id=category_id, supplier_id=supplier_id
    )

# --- Rota GET /{product_id} (read_product) --- sem alterações ---
@router.get("/{product_id}", response_model=ProductSchema, summary="Obter um produto por ID")
async def read_product( *, db: AsyncSession = Depends(get_db), product_id: int, current_user: UserModel = Depends(get_current_active_user) ) -> Any:
    """ Obtém os detalhes de um produto específico. """
    product = await crud.product.get(db, id=product_id, current_user=current_user)
    if not product:
        raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado." )
    return product

# --- Rota PUT /{product_id} (update_product) --- sem alterações ---
@router.put( "/{product_id}", response_model=ProductSchema, dependencies=[Depends(manager_permissions)], summary="Atualizar um produto" )
async def update_product( *, db: AsyncSession = Depends(get_db), product_id: int, product_in: ProductUpdate, current_user: UserModel = Depends(get_current_active_user) ) -> Any:
    """ Atualiza as informações de um produto. """
    db_product = await crud.product.get(db, id=product_id, current_user=current_user)
    if not db_product:
        raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado." )
    return await crud.product.update(db=db, db_obj=db_product, obj_in=product_in, current_user=current_user)

# --- Rota DELETE /{product_id} (delete_product) --- sem alterações ---
@router.delete( "/{product_id}", response_model=ProductSchema, dependencies=[Depends(manager_permissions)], summary="Deletar um produto" )
async def delete_product( *, db: AsyncSession = Depends(get_db), product_id: int, current_user: UserModel = Depends(get_current_active_user) ) -> Any:
    """ Remove um produto do sistema. """
    product_to_delete = await crud.product.get(db, id=product_id, current_user=current_user)
    if not product_to_delete:
         raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado." )
    deleted_product = await crud.product.remove(db=db, id=product_id, current_user=current_user)
    if not deleted_product: # Segurança extra
         raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado para exclusão." )
    return deleted_product

# --- Rota POST /{product_id}/stock-adjustment --- sem alterações ---
@router.post( "/{product_id}/stock-adjustment", status_code=status.HTTP_200_OK, dependencies=[Depends(manager_permissions)], summary="Ajustar o estoque de um produto" )
async def adjust_product_stock(
    *,
    db: AsyncSession = Depends(get_db),
    product_id: int,
    adjustment_in: StockAdjustment,
    current_user: UserModel = Depends(get_current_active_user)
) -> Any:
    """ Realiza um ajuste manual no estoque de um produto da loja atual. """
    product_to_adjust = await crud.product.get(db, id=product_id, current_user=current_user)
    if not product_to_adjust:
        raise HTTPException( status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado." )

    try:
        # --- Lógica de ajuste movida diretamente para cá ---
        from app.models.stock_movement import StockMovement, MovementType

        quantity_change = adjustment_in.new_stock_level - (product_to_adjust.stock or 0) # Trata None como 0
        product_to_adjust.stock = adjustment_in.new_stock_level # Define o novo estoque

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
            logger.warning( f"Estoque baixo para o produto ID {product_id} ('{product_to_adjust.name}'). " f"Estoque atual: {product_to_adjust.stock}, Limite: {product_to_adjust.low_stock_threshold}." )
        # --- Fim da lógica movida ---

        await db.commit()
        await db.refresh(movement)

    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao ajustar estoque para produto {product_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao ajustar estoque.")

    return {"message": "Estoque ajustado com sucesso.", "new_stock_level": movement.stock_after_movement}

# --- Adicionar Endpoints para Categoria e Fornecedor (para Selects) ---
# --- CORREÇÃO no response_model ---
@router.get("/lookups/categories", response_model=List[CategorySchema], summary="Listar categorias para selects")
async def list_categories(db: AsyncSession = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    # Reutiliza o CRUD de categorias existente
    # O CRUDBase.get_multi já filtra por store_id do current_user (exceto super_admin)
    return await crud.category.get_multi(db=db, current_user=current_user)

# --- CORREÇÃO no response_model ---
@router.get("/lookups/suppliers", response_model=List[SupplierSchema], summary="Listar fornecedores para selects")
async def list_suppliers(db: AsyncSession = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    # Reutiliza o CRUD de fornecedores existente
    # O CRUDBase.get_multi já filtra por store_id do current_user (exceto super_admin)
    return await crud.supplier.get_multi(db=db, current_user=current_user)