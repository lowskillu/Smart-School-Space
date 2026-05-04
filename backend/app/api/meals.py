"""Meals endpoints — food items and orders."""
from __future__ import annotations

from flask import g, jsonify, request

from . import api_bp
from ..core.security import jwt_required, require_role
from ..schemas.meals import FoodItemCreate, OrderCreate
from ..services.meal_service import meal_service
from ..models import db, CanteenMealTime


@api_bp.route("/meals/food-items", methods=["GET"])
@jwt_required
def list_food_items():
    item_type = request.args.get("type")
    return jsonify(meal_service.list_food_items(item_type))


@api_bp.route("/meals/food-items", methods=["POST"])
@jwt_required
@require_role("admin")
def create_food_item():
    body = FoodItemCreate.model_validate(request.get_json(force=True) or {})
    return jsonify(meal_service.create_food_item(body)), 201


@api_bp.route("/meals/food-items/<item_id>", methods=["PATCH", "PUT"])
@jwt_required
@require_role("admin")
def update_food_item(item_id):
    data = request.get_json(force=True) or {}
    return jsonify(meal_service.update_food_item(item_id, data))


@api_bp.route("/meals/food-items/<item_id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_food_item(item_id):
    meal_service.delete_food_item(item_id)
    return "", 204


@api_bp.route("/meals/orders", methods=["GET"])
@jwt_required
def list_orders():
    user_id = request.args.get("user_id") or g.current_user_id
    return jsonify(meal_service.list_orders(user_id))


@api_bp.route("/meals/orders", methods=["POST"])
@jwt_required
def create_order():
    body = OrderCreate.model_validate(request.get_json(force=True) or {})
    return jsonify(meal_service.create_order(g.current_user_id, body)), 201


# ──────────────────────────── Canteen Menu ──────────────────────────

@api_bp.route("/meals/canteen/menu", methods=["GET"])
@jwt_required
def list_canteen_menu():
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    return jsonify(meal_service.list_canteen_menu(start_date, end_date))


@api_bp.route("/meals/canteen/menu", methods=["POST", "PUT"])
@jwt_required
@require_role("admin")
def update_canteen_menu():
    data = request.get_json(force=True) or {}
    return jsonify(meal_service.update_canteen_entry(data))


@api_bp.route("/meals/canteen/menu/<entry_id>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_canteen_menu(entry_id):
    meal_service.delete_canteen_entry(entry_id)
    return "", 204


@api_bp.route("/meals/canteen/copy-day", methods=["POST"])
@jwt_required
@require_role("admin")
def copy_canteen_day():
    data = request.get_json(force=True) or {}
    meal_service.copy_canteen_day(data["source_date"], data["target_date"])
    return jsonify({"status": "success"})


@api_bp.route("/meals/canteen/apply-range", methods=["POST"])
@jwt_required
@require_role("admin")
def apply_canteen_range():
    data = request.get_json(force=True) or {}
    meal_service.apply_canteen_range(
        data["source_start_date"], 
        data["target_start_date"], 
        data["target_end_date"]
    )
    return jsonify({"status": "success"})


@api_bp.route("/meals/canteen/cascading-update", methods=["POST"])
@jwt_required
@require_role("admin")
def cascading_update():
    data = request.get_json(force=True) or {}
    meal_service.apply_canteen_cascading_update(
        data["source_date"], 
        data["meal_type"]
    )
    return jsonify({"status": "success"})


@api_bp.route("/meals/canteen/times", methods=["GET"])
@jwt_required
def get_canteen_times():
    times = CanteenMealTime.query.all()
    return jsonify([t.to_dict() for t in times])


@api_bp.route("/meals/canteen/times", methods=["POST"])
@jwt_required
@require_role("admin")
def update_canteen_times():
    data = request.get_json(force=True) or {}
    meal_type = data.get("meal_type")
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    
    if not meal_type:
        return jsonify({"error": "meal_type is required"}), 400
        
    time_entry = CanteenMealTime.query.filter_by(meal_type=meal_type).first()
    if not time_entry:
        time_entry = CanteenMealTime(meal_type=meal_type)
        db.session.add(time_entry)
        
    time_entry.start_time = start_time
    time_entry.end_time = end_time
    db.session.commit()
    
    # Update all future menu entries of this type to match the new global schedule
    from ..models import CanteenMenu
    CanteenMenu.query.filter(
        CanteenMenu.meal_type == meal_type,
        CanteenMenu.date >= datetime.now().strftime('%Y-%m-%d')
    ).update({
        'start_time': start_time,
        'end_time': end_time
    })
    db.session.commit()
    
    return jsonify(time_entry.to_dict())
