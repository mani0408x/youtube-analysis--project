from flask import Blueprint, request, jsonify, g
from firebase_admin import auth
from backend.models import User, db
from functools import wraps
from datetime import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

# No-op for compatibility with app.py's import
def init_oauth(app):
    pass

def verify_token(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Token Verification Error: {e}")
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized', 'message': 'Missing Token'}), 401
        
        token = auth_header.split(' ')[1]
        decoded = verify_token(token)
        if not decoded:
            return jsonify({'error': 'Unauthorized', 'message': 'Invalid Token'}), 401
        
        # Attach user to request context
        uid = decoded['uid']
        user = User.query.filter_by(firebase_uid=uid).first()
        g.user = user
        g.firebase_user = decoded
        
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/verify', methods=['POST'])
def verify_user():
    """
    Verifies Firebase Token and syncs user to MySQL
    """
    data = request.json
    token = data.get('token')
    if not token:
        return jsonify({'error': 'Token required'}), 400

    decoded = verify_token(token)
    if not decoded:
        return jsonify({'error': 'Invalid Token'}), 401

    uid = decoded['uid']
    email = decoded.get('email')
    name = decoded.get('name', 'User')
    picture = decoded.get('picture')

    # Sync User
    user = User.query.filter_by(firebase_uid=uid).first()
    if not user:
        user = User(
            firebase_uid=uid,
            email=email,
            name=name,
            photo_url=picture
        )
        db.session.add(user)
    else:
        # Update info if changed
        user.name = name
        user.photo_url = picture
        # Email can change in firebase, update it?
        user.email = email
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Database Error', 'details': str(e)}), 500

    return jsonify({
        'status': 'success',
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
