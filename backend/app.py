from backend.config import Config
from backend.extensions import db
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

    @app.route('/login')
    def login_page():
        return send_from_directory(app.static_folder, 'login.html')

    # Initialize extensions
    # init_firebase() - Removed in favor of Google OAuth

    db.init_app(app)

    with app.app_context():
        db.create_all()

    # Register blueprints
<<<<<<< HEAD
    from backend.routes.auth import auth_bp
    from backend.routes.api import api_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)
    
    # from backend.services.gemini_ai_service import gemini_bp
    # app.register_blueprint(gemini_bp)
    
    from backend.services.huggingface_service import hf_bp
    app.register_blueprint(hf_bp)
=======
    from backend.routes.auth import auth_bp, init_oauth
    from backend.routes.api import api_bp
    init_oauth(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)
    
    from backend.services.gemini_ai_service import gemini_bp
    app.register_blueprint(gemini_bp)
>>>>>>> 82fa5d1b9167d5712274c819447d13bfca8fbb70

    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}, 200

<<<<<<< HEAD
    # Global JSON Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return {'error': 'Resource not found'}, 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return {'error': 'Method not allowed'}, 405

    @app.errorhandler(500)
    def internal_error(e):
        return {'error': 'Internal system error'}, 500

=======
>>>>>>> 82fa5d1b9167d5712274c819447d13bfca8fbb70
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
