from flask import Blueprint, request, jsonify, g, current_app
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from backend.models import User, db
from functools import wraps
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

def init_oauth(app):
    pass

def verify_google_token(token):
    try:
        client_id = current_app.config.get('GOOGLE_CLIENT_ID')
        if not client_id:
            return None
        id_info = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        return id_info
    except Exception as e:
        # print(f"Google Token Verification Error: {e}")
        return None

def verify_custom_token(token):
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except Exception as e:
        # print(f"Custom Token Verification Error: {e}")
        return None

def create_custom_token(user_id):
    try:
        payload = {
            'sub': user_id,
            'iat': datetime.datetime.utcnow(),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
            'type': 'custom'
        }
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    except Exception as e:
        print(f"Token creation error: {e}")
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized', 'message': 'Missing Token'}), 401
        
        token = auth_header.split(' ')[1]
        
        # 1. Try Google Token
        google_decoded = verify_google_token(token)
        if google_decoded:
            uid = google_decoded['sub']
            user = User.query.filter_by(firebase_uid=uid).first()
            g.user = user
            g.auth_type = 'google'
            return f(*args, **kwargs)
            
        # 2. Try Custom JWT
        custom_decoded = verify_custom_token(token)
        if custom_decoded:
            user_id = custom_decoded['sub']
            user = User.query.get(user_id)
            g.user = user
            g.auth_type = 'custom'
            return f(*args, **kwargs)
            
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid Token'}), 401
        
    return decorated_function

# --- Routes ---

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if not email or not password or not name:
        return jsonify({'error': 'Missing required fields'}), 400
        
    # Check existing
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
        
    try:
        hashed_pw = generate_password_hash(password)
        new_user = User(
            email=email,
            name=name,
            password_hash=hashed_pw
            # firebase_uid is Null for email users
        )
        db.session.add(new_user)
        db.session.commit()
        
        # Generate Token
        token = create_custom_token(new_user.id)
        
        return jsonify({
            'status': 'success',
            'token': token,
            'user': {
                'id': new_user.id,
                'name': new_user.name,
                'email': new_user.email
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Signup failed', 'details': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Missing email or password'}), 400
        
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.password_hash:
        return jsonify({'error': 'Invalid credentials'}), 401
        
    if check_password_hash(user.password_hash, password):
        # Success
        token = create_custom_token(user.id)
        return jsonify({
            'status': 'success',
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'photo': user.photo_url
            }
        })
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/verify', methods=['POST'])
def verify_google_user():
    """
    Verifies Google ID Token and syncs user to MySQL
    """
    data = request.json
    token = data.get('token')
    if not token:
        return jsonify({'error': 'Token required'}), 400

    decoded = verify_google_token(token)
    if not decoded:
        return jsonify({'error': 'Invalid Token'}), 401

    # Standard Google Claims
    uid = decoded['sub']
    email = decoded.get('email')
    name = decoded.get('name', 'User')
    picture = decoded.get('picture')

    # Sync User
    user = User.query.filter_by(email=email).first() # Check by email first to link accounts?
    
    # Logic: 
    # 1. Check if email exists. 
    #    If yes, update firebase_uid if empty? OR just ensure it matches. 
    #    If yes but firebase_uid different (rare), what to do?
    # 2. If not email, check by firebase_uid.
    
    # Safe approach: Check by firebase_uid match first (strict google account link)
    user_by_uid = User.query.filter_by(firebase_uid=uid).first()
    
    if user_by_uid:
        user = user_by_uid
        # Update details
        user.name = name
        user.photo_url = picture
        # user.email = email # Keep email current
    else:
        # No user by UID. Check by email to see if they signed up with password before
        user_by_email = User.query.filter_by(email=email).first()
        if user_by_email:
            user = user_by_email
            # Link Google Account
            user.firebase_uid = uid 
            user.photo_url = picture
        else:
            # Create new
            user = User(
                firebase_uid=uid,
                email=email,
                name=name,
                photo_url=picture
            )
            db.session.add(user)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Database Error', 'details': str(e)}), 500

    # Return success. 
    # We can perform Token Exchange here: Return a Custom JWT to unify session management?
    # Or just return success and let frontend use the Google Token.
    # The 'login_required' supports Google Token, so we can just return success.
    # BUT, to be safer and support 'auth_type' consistency, let's returning a custom token is nicer.
    # However, keeping it minimal: Frontend sends 'token' (Google credential) to 'verify'. 
    # If we return a NEW token, frontend must switch to using that.
    # Let's return a 'token' field. If frontend wants to use it, good.
    
    # Let's return the Custom JWT as 'token' so frontend can use it (and it lasts 7 days vs Google's 1 hour).
    new_token = create_custom_token(user.id)
    
    return jsonify({
        'status': 'success',
        'token': new_token, # Send our long-lived token
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'photo': user.photo_url
        }
    })

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_me():
    if g.user:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': g.user.id,
                'name': g.user.name,
                'email': g.user.email,
                'photo': g.user.photo_url
            }
        })
    return jsonify({'authenticated': False}), 401
