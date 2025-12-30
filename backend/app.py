from backend.config import Config
from backend.extensions import db, init_firebase
from backend import models # Ensure models are loaded before create_all
from flask import send_from_directory, Flask

def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../frontend/public', static_url_path='')
    app.config.from_object(config_class)

    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/dashboard')
    def dashboard():
        return send_from_directory(app.static_folder, 'dashboard.html')

    # Initialize extensions
    init_firebase()
    db.init_app(app)

    with app.app_context():
        db.create_all()

    # Register blueprints
    from backend.routes.auth import auth_bp, init_oauth
    from backend.routes.api import api_bp
    init_oauth(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)

    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}, 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
