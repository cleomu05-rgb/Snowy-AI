from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os

app = Flask(__name__)

# --- CONFIGURATION API ---
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyA6iaB7pLIMypL5ieKlsJ6ibAbm2rQc_eM")
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash-latest')

user_sessions = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(force=True)
    username = data.get('username', '').lower()
    if username and username not in user_sessions:
        user_sessions[username] = {"connected": False, "pending": None}
    return jsonify({"success": True})

@app.route('/api/status/<username>')
def status(username):
    user = user_sessions.get(username.lower())
    return jsonify({"connected": user["connected"] if user else False})

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json(force=True)
    username = data.get('username', '').lower()
    message = data.get('message', '')
    
    prompt = f"""
    You are Snowy AI, an advanced AI assistant directly integrated into Roblox (similar to Antigravity).
    Your job is to explore game files, create exploits, and manipulate the game environment based on the user's request.
    The user wants: {message}
    
    RULES:
    1. Reply ONLY with valid Roblox Lua code. NO markdown blocks (```lua), NO conversational text.
    2. Write efficient exploit code using standard functions if needed.
    3. If asked to analyze or explore, write code that prints information using `print("ANALYSED: [information]")`.
    """
    
    try:
        response = model.generate_content(prompt)
        lua_code = response.text.replace("```lua", "").replace("```", "").strip()
        user_sessions[username]["pending"] = lua_code
        return jsonify({"success": True, "message": "Command sent to Roblox!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/roblox/connect', methods=['POST'])
def rb_connect():
    data = request.get_json(force=True)
    username = data.get('username', '').lower()
    if not username:
        return jsonify({"error": "No username provided"}), 400
        
    if username in user_sessions:
        user_sessions[username]["connected"] = True
    else:
        user_sessions[username] = {"connected": True, "pending": None}
    return jsonify({"success": True})

@app.route('/api/roblox/poll/<username>')
def rb_poll(username):
    user = user_sessions.get(username.lower())
    if user and user["pending"]:
        cmd = user["pending"]
        user["pending"] = None
        return jsonify({"command": cmd})
    return jsonify({"command": None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
