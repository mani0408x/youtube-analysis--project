import os
import json
import requests
from flask import Blueprint, request, jsonify

hf_bp = Blueprint('huggingface_ai', __name__, url_prefix='/api/ai')

# helper to get hf token
def get_hf_headers():
    token = os.getenv('HUGGINGFACE_API_KEY')
    if not token:
        return None
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

# call the hf model
def query_ai(messages):
    headers = get_hf_headers()
    if not headers:
        return {"error": "API Key missing"}
    
    url = "https://router.huggingface.co/v1/chat/completions"
    data = {
        "model": "meta-llama/Meta-Llama-3-8B-Instruct",
        "messages": messages,
        "max_tokens": 500,
        "temperature": 0.7
    }
    
    try:
        resp = requests.post(url, headers=headers, json=data, timeout=30)
        if resp.status_code == 503:
             return {"error": "AI is loading..."}
        
        result = resp.json()
        if 'choices' in result:
            return {"content": result['choices'][0]['message']['content']}
        return {"error": "AI error"}
    except:
        return {"error": "Connection failed"}

# clean up json from AI response
def clean_json(text):
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return text.strip()

# generate titles and descriptions
def generate_title_desc(topic):
    prompt = f"Generate 5 video titles and 1 description for: {topic}. Return JSON: {{\"titles\":[], \"description\":\"\"}}"
    messages = [{"role": "user", "content": prompt}]
    
    res = query_ai(messages)
    if 'error' in res: return res, 500
    
    try:
        return json.loads(clean_json(res['content'])), 200
    except:
        return {"error": "Bad JSON"}, 500

# generate channel names
def generate_names(topic):
    prompt = f"Generate 5 channel names for: {topic}. Return JSON: {{\"names\":[]}}"
    messages = [{"role": "user", "content": prompt}]
    
    res = query_ai(messages)
    if 'error' in res: return res, 500
    
    try:
        return json.loads(clean_json(res['content'])), 200
    except:
        return {"error": "Bad JSON"}, 500

@hf_bp.route('/generate-title-description', methods=['POST'])
def api_titles():
    data = request.json
    topic = data.get('video_topic')
    if not topic: return jsonify({"error": "Need topic"}), 400
    ret, code = generate_title_desc(topic)
    return jsonify(ret), code

@hf_bp.route('/generate-channel-name', methods=['POST'])
def api_names():
    data = request.json
    topic = data.get('topic')
    if not topic: return jsonify({"error": "Need topic"}), 400
    ret, code = generate_names(topic)
    return jsonify(ret), code
