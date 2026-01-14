import os
import json
import logging
import google.generativeai as genai
from flask import Blueprint, request, jsonify

# Configure Logging
# Using a specific logger for this module to avoid interfering with global config if not set
logger = logging.getLogger(__name__)

# Initialize Blueprint
# url_prefix is set to /api so the full path matches /api/ai/generate-title-description if registered with /api prefix
# However, if the main app registers api_bp with /api, and we want to register this one?
# The user asked for endpoint: /api/ai/generate-title-description
# If we register this blueprint with NO prefix in app.py, we should set url_prefix here to /api.
# If we register with /api prefix in app.py, we should set here to /ai...
# To be "independent" and "plug-and-play", it is safest to define the blueprint to handle its own full path segments relative to the registration point.
# I will use url_prefix='/api' here. Users usually register 'routes' blueprints at root or /api.
# Let's assume user registers it at root `app.register_blueprint(gemini_bp)`.
gemini_bp = Blueprint('gemini_ai', __name__)

def configure_gemini():
    """
    Configures the Gemini API client.
    Returns:
        bool: True if configured successfully, False otherwise.
    """
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment variables.")
        return False
    genai.configure(api_key=api_key)
    return True

def generate_title_description_logic(topic, keywords, tone, audience):
    """
    Core logic to call Gemini API.
    """
    if not configure_gemini():
         return {"error": "Server configuration error: API Key missing"}, 500

    try:
        # Use valid model name from available list
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Construct prompt
        kw_str = ', '.join(keywords) if isinstance(keywords, list) else str(keywords)
        prompt = f"""
        Act as a YouTube Expert. Generate a catchy, SEO-friendly YouTube video Title and a compelling Description.
        
        Context:
        - Topic: {topic}
        - Keywords: {kw_str}
        - Tone: {tone}
        - Target Audience: {audience}
        
        Instructions:
        1. Title should be clickable but not clickbait.
        2. Description should be 2-3 sentences, engaging, and include keywords.
        3. Output MUST be valid JSON only. No markdown formatting.
        
        Expected JSON Format:
        {{
          "title": "Generated Title",
          "description": "Generated Description"
        }}
        """
        
        response = model.generate_content(prompt)
        
        # Safety check for empty response
        if not response or not response.text:
             return {"error": "Empty response from AI Service"}, 502

        # Clean response to ensure JSON
        text = response.text.replace('```json', '').replace('```', '').strip()
        
        try:
            result = json.loads(text)
            # Validation
            if 'title' not in result or 'description' not in result:
                return {"error": "Invalid response format from AI"}, 502
            return result, 200
        except json.JSONDecodeError:
            logger.error(f"Failed to parse Gemini response: {text}")
            return {"error": "Failed to generate valid JSON response"}, 500
            
    except Exception as e:
        logger.error(f"Gemini API Error: {str(e)}")
        # Graceful error handling - do not crash
        return {"error": "AI Service Temporary Unavailable"}, 503

@gemini_bp.route('/api/ai/generate-title-description', methods=['POST'])
def generate_metadata():
    """
    API Endpoint to generate YouTube Title and Description.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400

        required_fields = ['video_topic', 'keywords', 'tone', 'target_audience']
        missing = [field for field in required_fields if not data.get(field)]
        
        if missing:
             return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
             
        topic = data['video_topic']
        keywords = data['keywords']
        tone = data['tone']
        audience = data['target_audience']
        
        response_data, status_code = generate_title_description_logic(topic, keywords, tone, audience)
        return jsonify(response_data), status_code

    except Exception as e:
        logger.error(f"Endpoint Error: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500
