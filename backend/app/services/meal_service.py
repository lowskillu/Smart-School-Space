"""Meal service — food items and order fulfillment."""
from __future__ import annotations

from ..core.cache import timed_cache, invalidate_cache
from ..extensions import db
from ..core.errors import NotFoundError
from ..core.logging_cfg import get_logger
from ..repositories.meal_repo import food_item_repo, order_repo, canteen_repo
from ..schemas.meals import FoodItemCreate, OrderCreate

logger = get_logger(__name__)

_FOOD_CACHE_KEY = "food_items_all"


class MealService:

    def list_food_items(self, item_type: str | None = None) -> list[dict]:
        items = food_item_repo.list_by_type(item_type)
        return [i.to_dict() for i in items]

    def create_food_item(self, data: FoodItemCreate | dict) -> dict:
        if isinstance(data, dict):
            params = data
        else:
            params = data.model_dump()
            
        item = food_item_repo.create(**params)
        invalidate_cache(_FOOD_CACHE_KEY)
        logger.info("Food item created: %s", params.get("name"))
        return item.to_dict()

    def update_food_item(self, item_id: str, data: dict) -> dict:
        item = food_item_repo.get_by_id(item_id)
        if not item:
            raise NotFoundError("Food item", item_id)
        
        for k, v in data.items():
            if hasattr(item, k):
                setattr(item, k, v)
        
        db.session.commit()
        invalidate_cache(_FOOD_CACHE_KEY)
        return item.to_dict()

    def delete_food_item(self, item_id: str):
        food_item_repo.delete_by_id(item_id)
        invalidate_cache(_FOOD_CACHE_KEY)

    def create_order(self, user_id: str, data: OrderCreate) -> dict:
        order = order_repo.create_with_items(
            user_id=user_id,
            items_data=[i.model_dump() for i in data.items],
            status=data.status,
        )
        logger.info(
            "Order created: user=%s items=%d total=%.2f status=%s",
            user_id, len(data.items), order.total_amount, data.status,
        )
        return order.to_dict()

    def list_orders(self, user_id: str) -> list[dict]:
        orders = order_repo.list_by_user(user_id)
        return [o.to_dict() for o in orders]

    def list_canteen_menu(self, start_date: str, end_date: str) -> list[dict]:
        entries = canteen_repo.list_by_date_range(start_date, end_date)
        return [e.to_dict() for e in entries]

    def update_canteen_entry(self, data: dict) -> dict:
        entry_id = data.get("id")
        if entry_id:
            entry = canteen_repo.get_by_id(entry_id)
            if entry:
                entry.name = data.get("name", entry.name)
                entry.calories = data.get("calories", entry.calories)
                entry.proteins = data.get("proteins", entry.proteins)
                entry.fats = data.get("fats", entry.fats)
                entry.carbs = data.get("carbs", entry.carbs)
                entry.start_time = data.get("start_time", entry.start_time)
                entry.end_time = data.get("end_time", entry.end_time)
                entry.food_item_id = data.get("food_item_id", entry.food_item_id)
                db.session.commit()
                return entry.to_dict()
        
        # Create new
        from ..models import CanteenMenu
        new_entry = CanteenMenu(
            date=data["date"],
            meal_type=data["meal_type"],
            name=data["name"],
            calories=data.get("calories", 0),
            proteins=data.get("proteins", 0.0),
            fats=data.get("fats", 0.0),
            carbs=data.get("carbs", 0.0),
            start_time=data.get("start_time"),
            end_time=data.get("end_time"),
            food_item_id=data.get("food_item_id")
        )
        db.session.add(new_entry)
        db.session.commit()
        return new_entry.to_dict()

    def delete_canteen_entry(self, entry_id: str):
        canteen_repo.delete_by_id(entry_id)

    def copy_canteen_day(self, source_date: str, target_date: str):
        canteen_repo.copy_day(source_date, target_date)

    def apply_canteen_range(self, source_start_date: str, target_start_date: str, target_end_date: str):
        """
        Copies a template week (7 days starting from source_start_date)
        to a target date range [target_start_date, target_end_date].
        Skips Saturdays (5) and Sundays (6).
        """
        import datetime
        from ..models import CanteenMenu
        
        src_dt = datetime.datetime.strptime(source_start_date, "%Y-%m-%d")
        tgt_start = datetime.datetime.strptime(target_start_date, "%Y-%m-%d")
        tgt_end = datetime.datetime.strptime(target_end_date, "%Y-%m-%d")
        
        # 1. Fetch template week (7 days)
        template_week = []
        for i in range(7):
            d_str = (src_dt + datetime.timedelta(days=i)).strftime("%Y-%m-%d")
            entries = CanteenMenu.query.filter_by(date=d_str).all()
            template_week.append(entries)
            
        # 2. Loop through target range
        curr = tgt_start
        while curr <= tgt_end:
            # Skip weekends: Saturday=5, Sunday=6
            if curr.weekday() >= 5:
                curr += datetime.timedelta(days=1)
                continue
                
            # Match weekday with template
            day_offset = (curr.weekday() - src_dt.weekday()) % 7
            source_entries = template_week[day_offset]
            
            target_str = curr.strftime("%Y-%m-%d")
            canteen_repo.delete_by_date(target_str)
            
            for entry in source_entries:
                new_entry = CanteenMenu(
                    date=target_str,
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
            
            curr += datetime.timedelta(days=1)
            
        db.session.commit()
        return True

    def apply_canteen_cascading_update(self, entry_id: str, target_end_date: str):
        """
        Applies changes from a single entry to all future days 
        with the same weekday and meal_type up to target_end_date.
        """
        import datetime
        from ..models import CanteenMenu
        
        source_entry = CanteenMenu.query.get(entry_id)
        if not source_entry:
            return False
            
        src_dt = datetime.datetime.strptime(source_entry.date, "%Y-%m-%d")
        end_dt = datetime.datetime.strptime(target_end_date, "%Y-%m-%d")
        
        # Find future days with same weekday
        curr = src_dt + datetime.timedelta(days=7)
        while curr <= end_dt:
            # Skip weekends just in case
            if curr.weekday() >= 5:
                curr += datetime.timedelta(days=7)
                continue
                
            date_str = curr.strftime("%Y-%m-%d")
            
            # Check if an entry for this meal_type already exists on this day
            # If it exists, update it. If not, maybe create? 
            # User wants "change everywhere", so we'll update or create.
            existing = CanteenMenu.query.filter_by(
                date=date_str, 
                meal_type=source_entry.meal_type
            ).first()
            
            if existing:
                existing.name = source_entry.name
                existing.calories = source_entry.calories
                existing.proteins = source_entry.proteins
                existing.fats = source_entry.fats
                existing.carbs = source_entry.carbs
                existing.start_time = source_entry.start_time
                existing.end_time = source_entry.end_time
                existing.food_item_id = source_entry.food_item_id
            else:
                new_entry = CanteenMenu(
                    date=date_str,
                    meal_type=source_entry.meal_type,
                    name=source_entry.name,
                    calories=source_entry.calories,
                    proteins=source_entry.proteins,
                    fats=source_entry.fats,
                    carbs=source_entry.carbs,
                    start_time=source_entry.start_time,
                    end_time=source_entry.end_time,
                    food_item_id=source_entry.food_item_id
                )
                db.session.add(new_entry)
                
            curr += datetime.timedelta(days=7)
            
        db.session.commit()
        return True

meal_service = MealService()
