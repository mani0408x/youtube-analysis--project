from flask import Flask
from backend.app import create_app
from backend.models import db, User, Channels
import json

def seed_data():
    print("Starting seeding...")
    app = create_app()
    print("App created.")
    with app.app_context():
        print("In app context...")
        # 1. Define Channels
        channel_data = [
            {
                'channel_id': 'UCj22tfcQrWG7EMEKS0qLeEg',
                'channel_name': 'CarryMinati',
                'details': {
                    'title': 'CarryMinati',
                    'thumbnail_url': 'https://yt3.googleusercontent.com/j0v_v_D3ox1pRExpN5yB9L-c-2KxT8O5K1_X6o_xXmXm_v-iO4Y_S_X_Y_S_S_X_Y_S_S_X_Y_S', # placeholder
                    'subscriber_count': 40000000,
                    'view_count': 3000000000,
                    'video_count': 180,
                    'uploads_playlist': 'UUj22tfcQrWG7EMEKS0qLeEg'
                }
            },
            {
                'channel_id': 'UC7eH_shsl9RAn0Vv9xW9xOQ',
                'channel_name': 'Ashish Chanchalani',
                'details': {
                    'title': 'Ashish Chanchalani',
                    'thumbnail_url': 'https://yt3.googleusercontent.com/ytc/AIdro_n_Y_X_Y_S_S_X_Y_S_S_X_Y_S_S_X_Y_S_S_X_Y_S', # placeholder
                    'subscriber_count': 30000000,
                    'view_count': 4000000000,
                    'video_count': 150,
                    'uploads_playlist': 'UU7eH_shsl9RAn0Vv9xW9xOQ'
                }
            }
        ]

        # 2. Add/Update Channels
        for c in channel_data:
            channel = Channels.query.filter_by(channel_id=c['channel_id']).first()
            if not channel:
                channel = Channels(
                    channel_id=c['channel_id'],
                    channel_name=c['channel_name']
                )
                channel.set_details(c['details'])
                db.session.add(channel)
            else:
                channel.channel_name = c['channel_name']
                channel.set_details(c['details'])
            db.session.commit()
            print(f"Channel {c['channel_name']} ensured.")

        # 3. Define Mappings
        mappings = [
            {'email': 'maniupgkp@gmail.com', 'channel_id': 'UCj22tfcQrWG7EMEKS0qLeEg'},
            {'email': 'pandeymani@gmail.com', 'channel_id': 'UC7eH_shsl9RAn0Vv9xW9xOQ'}
        ]

        # 4. Perform Mappings
        for m in mappings:
            user = User.query.filter_by(email=m['email']).first()
            if not user:
                user = User(email=m['email'])
                db.session.add(user)
                db.session.commit()
            
            channel = Channels.query.filter_by(channel_id=m['channel_id']).first()
            if channel:
                user.assigned_channel_id = channel.id
                db.session.commit()
                print(f"User {m['email']} mapped to {channel.channel_name}")

if __name__ == '__main__':
    seed_data()
