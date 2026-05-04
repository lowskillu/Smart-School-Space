"""Meals request/response schemas."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field
from .common import OrmModel


class FoodItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    price: str = Field(default="0")
    category: str | None = None
    type: Literal["canteen", "buffet"] = "buffet"
    weight: str | None = None
    calories: int | None = Field(default=None, ge=0)
    proteins: float | None = Field(default=None, ge=0)
    fats: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    image_url: str | None = None


class FoodItemOut(OrmModel):
    id: str
    name: str
    description: str | None = None
    price: str
    category: str | None = None
    type: str
    weight: str | None = None
    calories: int | None = None
    proteins: float | None = None
    fats: float | None = None
    carbs: float | None = None
    image_url: str | None = None


class OrderItemIn(BaseModel):
    food_item_id: str
    quantity: int = Field(ge=1, le=50)


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1)
    status: Literal["paid", "pending_parental_approval"] = "paid"


class OrderItemOut(BaseModel):
    food_item_id: str
    food_item_name: str
    quantity: int
    price: str


class OrderOut(OrmModel):
    id: str
    user_id: str
    total_amount: float
    status: str
    created_at: str | None = None
    items: list[OrderItemOut] = []
