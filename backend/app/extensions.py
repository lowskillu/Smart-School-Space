"""Flask extension singletons.

Import and use these in any module — they are bound to the app
via ``init_app()`` inside the application factory.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_babel import Babel
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
babel = Babel()
jwt = JWTManager()
