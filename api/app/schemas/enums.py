# api/app/schemas/enums.py
import enum
from enum import Enum

class UnitOfMeasure(str, enum.Enum):
    KILOGRAM = "kg"
    GRAM = "g"
    LITER = "l"
    MILLILITER = "ml"
    UNIT = "un"

class TableShape(str, enum.Enum):
    RECTANGLE = "rectangle"
    ROUND = "round"

class TableStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"

class OrderStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    PAID = "paid"
    CANCELLED = "cancelled"
    # --- NOVO STATUS ---
    ON_HOLD = "on_hold" 
    # -------------------

class OrderType(str, Enum):
    DINE_IN = "DINE_IN"
    DELIVERY = "DELIVERY"
    TAKEOUT = "TAKEOUT"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PIX = "pix"
    OTHER = "other"

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    CASHIER = "cashier"

class OrderItemStatus(str, Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERED = "delivered"