from flask import Blueprint, redirect, url_for, session, current_app, jsonify
from authlib.integrations.flask_client import OAuth
from backend.models import User, db
from backend.extensions import db as _db # Access to db instance

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')
oauth = OAuth()

def init_oauth(app):
    oauth.init_app(app)
    oauth.register(
        name='google',
        client_id=app.config['GOOGLE_CLIENT_ID'],
        client_secret=app.config['GOOGLE_CLIENT_SECRET'],
        access_token_url='https://accounts.google.com/o/oauth2/token',
        access_token_params=None,
        authorize_url='https://accounts.google.com/o/oauth2/auth',
        authorize_params=None,
        api_base_url='https://www.googleapis.com/oauth2/v1/',
        client_kwargs={'scope': 'openid email profile', 'prompt': 'select_account'},
        jwks_uri='https://www.googleapis.com/oauth2/v3/certs'
    )

@auth_bp.route('/login')
def login():
    redirect_uri = url_for('auth.callback', _external=True)
    
    with open('auth_debug.log', 'a') as f:
        f.write(f"\n--- Login Attempt ---\n")
        f.write(f"Initial generated URI: {redirect_uri}\n")
    
    # Ensure consistency: Force localhost if currently 127.0.0.1
    if '127.0.0.1' in redirect_uri:
        redirect_uri = redirect_uri.replace('127.0.0.1', 'localhost')
        with open('auth_debug.log', 'a') as f:
            f.write(f"Modified URI (forced localhost): {redirect_uri}\n")
            
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route('/callback')
def callback():
    try:
        token = oauth.google.authorize_access_token()
        resp = oauth.google.get('userinfo')
        user_info = resp.json()
        
        with open('auth_debug.log', 'a') as f:
            f.write(f"Callback successful. User: {user_info.get('email')}\n")
        
        user = User.query.filter_by(google_id=user_info['id']).first()
        if not user:
            user = User(
                google_id=user_info['id'],
                email=user_info['email'],
                name=user_info['name'],
                avatar=user_info.get('picture')
            )
            db.session.add(user)
            db.session.commit()
        
        session['user_id'] = user.id
        return redirect('/dashboard') 
    except Exception as e:
        with open('auth_debug.log', 'a') as f:
            f.write(f"Callback ERROR: {str(e)}\n")
            import traceback
            traceback.print_exc(file=f)
        return jsonify({'error': str(e)}), 400

@auth_bp.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect('/')

@auth_bp.route('/me')
def curren_user():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401
    
    user = User.query.get(session['user_id'])
    return jsonify({
        'authenticated': True,
        'user': {
            'name': user.name,
            'email': user.email,
            'avatar': user.avatar
        }
    })
