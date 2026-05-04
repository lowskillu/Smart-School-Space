import os
import sys
import uuid

# Ensure we can import from the app directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import FoodItem, CanteenMenu

def seed_canteen():
    app = create_app()
    with app.app_context():
        print("🍳 Seeding Canteen Dish Library...")
        
        dishes = [
            # Breakfast
            {"name": "Овсяная каша с ягодами", "calories": 250, "proteins": 8, "fats": 6, "carbs": 42, "type": "canteen", "category": "Завтрак"},
            {"name": "Омлет с сыром", "calories": 320, "proteins": 18, "fats": 24, "carbs": 4, "type": "canteen", "category": "Завтрак"},
            {"name": "Блины с творогом", "calories": 380, "proteins": 12, "fats": 14, "carbs": 52, "type": "canteen", "category": "Завтрак"},
            {"name": "Сырники из творога", "calories": 350, "proteins": 20, "fats": 12, "carbs": 38, "type": "canteen", "category": "Завтрак"},
            
            # Lunch
            {"name": "Борщ классический", "calories": 180, "proteins": 6, "fats": 8, "carbs": 22, "type": "canteen", "category": "Обед"},
            {"name": "Суп-пюре грибной", "calories": 210, "proteins": 4, "fats": 12, "carbs": 24, "type": "canteen", "category": "Обед"},
            {"name": "Куриная грудка гриль", "calories": 280, "proteins": 42, "fats": 8, "carbs": 0, "type": "canteen", "category": "Обед"},
            {"name": "Плов с говядиной", "calories": 450, "proteins": 18, "fats": 22, "carbs": 48, "type": "canteen", "category": "Обед"},
            {"name": "Котлета рыбная с рисом", "calories": 410, "proteins": 22, "fats": 14, "carbs": 54, "type": "canteen", "category": "Обед"},
            {"name": "Салат Цезарь", "calories": 320, "proteins": 14, "fats": 18, "carbs": 12, "type": "canteen", "category": "Обед"},
            
            # Snack
            {"name": "Яблоко свежее", "calories": 52, "proteins": 0.3, "fats": 0.2, "carbs": 14, "type": "canteen", "category": "Полдник"},
            {"name": "Йогурт натуральный", "calories": 120, "proteins": 8, "fats": 3, "carbs": 15, "type": "canteen", "category": "Полдник"},
            {"name": "Пирожок с капустой", "calories": 240, "proteins": 6, "fats": 8, "carbs": 36, "type": "canteen", "category": "Полдник"},
            
            # Dinner
            {"name": "Гречка с тефтелями", "calories": 430, "proteins": 24, "fats": 18, "carbs": 44, "type": "canteen", "category": "Ужин"},
            {"name": "Макароны по-флотски", "calories": 480, "proteins": 22, "fats": 20, "carbs": 56, "type": "canteen", "category": "Ужин"},
            {"name": "Запеченная рыба с овощами", "calories": 310, "proteins": 28, "fats": 12, "carbs": 18, "type": "canteen", "category": "Ужин"},
        ]

        for d in dishes:
            # Check if exists
            exists = FoodItem.query.filter_by(name=d["name"], type="canteen").first()
            if not exists:
                item = FoodItem(
                    name=d["name"],
                    calories=d["calories"],
                    proteins=d["proteins"],
                    fats=d["fats"],
                    carbs=d["carbs"],
                    type=d["type"],
                    category=d["category"],
                    price="0"
                )
                db.session.add(item)
        
        db.session.commit()
        print("✅ Canteen Dish Library seeded!")

if __name__ == "__main__":
    seed_canteen()
