import os
import requests
import json
import random

# --- GROQ API INTEGRATION ---

def get_groq_headers():
    token = os.getenv('GROQ_API_KEY')
    if not token:
        return None
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def query_groq(messages):
    """
    Sends request to Groq OpenAI-compatible endpoint with strict validation.
    """
    headers = get_groq_headers()
    if not headers:
        return {"error": "Missing GROQ_API_KEY"}
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    
    # 1. Validate Messages Payload
    if not messages or not isinstance(messages, list):
        return {"error": "Internal Error: Messages must be a list"}
    
    for msg in messages:
        if not isinstance(msg, dict) or 'role' not in msg or 'content' not in msg:
             return {"error": "Internal Error: Invalid message format"}
    
    # 2. Construct Payload
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
        "top_p": 1,
        "stream": False,
        "stop": None
    }
    
    try:
        # Debug Log: Log the exact payload being sent
        try:
             with open('ai_debug.log', 'a') as f: 
                 f.write(f"Sending Payload: {json.dumps(payload)}\n")
        except: pass

        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if resp.status_code == 200:
            result = resp.json()
            if 'choices' in result and result['choices']:
                return {"content": result['choices'][0]['message']['content'].strip()}
            return {"error": "Empty Response from Groq"}
            
        # Error Handling
        error_msg = f"Groq Error {resp.status_code}: {resp.text}"
        print(error_msg)
        try:
            with open('ai_debug.log', 'a') as f: f.write(error_msg + '\n')
        except: pass
        
        if resp.status_code == 400: return {"error": f"Bad Request (400): {resp.text}"}
        if resp.status_code == 401: return {"error": "Invalid Groq API Key"}
        if resp.status_code == 429: return {"error": "Rate Limit Exceeded"}
        
        return {"error": f"API Error: {resp.status_code}"}
        
    except Exception as e:
        print(f"Groq Connection Exception: {e}")
        return {"error": f"Connection Error: {str(e)}"}

def clean_json(text):
    """Extract JSON from markdown code blocks if present."""
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return text.strip()

# --- MAIN EXPORTS ---

def generate_video_ideas(topic, channel_name):
    """
    Generates video ideas using Groq Llama 3.
    """
    prompt = f"""
    Generate 5 viral YouTube video titles for a channel named '{channel_name}' about the topic '{topic}'.
    Return ONLY a JSON object with a key 'titles' containing a list of strings.
    Example: {{"titles": ["Title 1", "Title 2"]}}
    """
    
    # Added System Prompt for robustness
    messages = [
        {"role": "system", "content": "You are a creative YouTube Strategist. Output JSON only."},
        {"role": "user", "content": prompt}
    ]
    
    res = query_groq(messages)
    
    if 'error' in res:
        return [{'id': 0, 'title': f"FAILED: {res['error']}", 'confidence': 0}]
    
    content = res['content']
    try:
        data = json.loads(clean_json(content))
        titles = data.get('titles', [])
        return [{'id': i+1, 'title': t, 'confidence': random.randint(85, 99)} for i, t in enumerate(titles)]
    except Exception as e:
        print(f"JSON Parse Error: {e}")
        return [{'id': 0, 'title': "Error: Failed to parse AI JSON", 'confidence': 0}]

def generate_script(title, tone):
    """
    Generates script using Groq Llama 3.
    """
    prompt = f"Write a structured YouTube video script for '{title}' with a {tone} tone. Use Markdown headings (##, ###)."
    
    messages = [
        {"role": "system", "content": "You are a professional YouTube Scriptwriter."},
        {"role": "user", "content": prompt}
    ]
    
    res = query_groq(messages)
    
    if 'error' in res:
        return f"**AI Generation Failed:** {res['error']}"
        
    return res['content']

def generate_channel_names(keywords):
    """
    Generates creative channel names using Groq Llama 3.
    """
    prompt = f"""
    Generate 10 creative, catchy, and available-sounding YouTube channel names based on keywords: '{keywords}'.
    Return ONLY a JSON object with a key 'names' containing a list of strings.
    Example: {{"names": ["Name 1", "Name 2"]}}
    """
    
    messages = [
        {"role": "system", "content": "You are a creative brand naming expert. Output JSON only."},
        {"role": "user", "content": prompt}
    ]
    
    res = query_groq(messages)
    if 'error' in res:
         return [{'title': f"Error: {res['error']}"}]
         
    try:
        data = json.loads(clean_json(res['content']))
        names = data.get('names', [])
        # Return in same format as ideas for frontend compatibility (title property)
        return [{'id': i+1, 'title': n, 'confidence': random.randint(90, 99)} for i, n in enumerate(names)]
    except:
        return [{'title': "Error parsing names"}]
