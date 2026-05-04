"""Meal repository."""
from __future__ import annotations

from ..extensions import db
from ..models import FoodItem, Order, OrderItem, CanteenMenu
from .base import BaseRepository


class FoodItemRepository(BaseRepository[FoodItem]):
    model = FoodItem

    def list_by_type(self, item_type: str | None = None) -> list[FoodItem]:
        if item_type:
            return FoodItem.query.filter_by(type=item_type).all()
        return FoodItem.query.all()


class OrderRepository(BaseRepository[Order]):
    model = Order

    def list_by_user(self, user_id: str) -> list[Order]:
        return Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()

    def create_with_items(
        self,
        user_id: str,
        items_data: list[dict],  # [{"food_item_id": str, "quantity": int}]
        status: str = "paid",
    ) -> Order:
        """Create order + all line items in a single transaction."""
        total = 0.0
        order = Order(user_id=user_id, status=status, total_amount=0.0)
        db.session.add(order)
        db.session.flush()

        for item_d in items_data:
            food = db.session.get(FoodItem, item_d["food_item_id"])
            qty = int(item_d.get("quantity", 1))
            if food:
                # Try to extract number from price string (e.g. "550тг" -> 550)
                import re
                try:
                    # Remove all non-numeric characters except dots
                    cleaned_price = re.sub(r'[^\d.]', '', str(food.price))
                    numeric_price = float(cleaned_price) if cleaned_price else 0.0
                except (ValueError, TypeError):
                    numeric_price = 0.0
                total += numeric_price * qty
            order_item = OrderItem(
                order_id=order.id,
                food_item_id=item_d["food_item_id"],
                quantity=qty,
            )
            db.session.add(order_item)

        order.total_amount = round(total, 2)
        db.session.commit()
        return order


class CanteenMenuRepository(BaseRepository[CanteenMenu]):
    model = CanteenMenu

    def list_by_date_range(self, start_date: str, end_date: str) -> list[CanteenMenu]:
        return CanteenMenu.query.filter(
            CanteenMenu.date >= start_date,
            CanteenMenu.date <= end_date
        ).all()

    def delete_by_date(self, date: str):
        CanteenMenu.query.filter_by(date=date).delete()
        db.session.commit()

    def copy_day(self, source_date: str, target_date: str):
        # 1. Clear target day
        self.delete_by_date(target_date)
        
        # 2. Get source entries
        source_entries = CanteenMenu.query.filter_by(date=source_date).all()
        
        # 3. Clone to target
        for entry in source_entries:
            new_entry = CanteenMenu(
                date=target_date,
                meal_type=entry.meal_type,
                name=entry.name,
                calories=entry.calories,
                proteins=entry.proteins,
                fats=entry.fats,
                carbs=entry.carbs,
                start_time=entry.start_time,
                end_time=entry.end_time,
                food_item_id=entry.food_item_id
            )
            db.session.add(new_entry)
        
        db.session.commit()

food_item_repo = FoodItemRepository()
order_repo = OrderRepository()
canteen_repo = CanteenMenuRepository()
