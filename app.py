from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os

app = Flask(__name__)

# --- Configuration ---
# The user will need to set this environment variable or replace it here
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# In-memory storage for simplicity (for production, use a DB or Redis)
# Structure: { username: { "connected": bool, "pending_command": str or None } }
user_sessions = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    if not username:
        return jsonify({"error": "Username required"}), 400
    
    if username not in user_sessions:
        user_sessions[username] = {"connected": False, "pending_command": None}
    
    return jsonify({"success": True, "connected": user_sessions[username]["connected"]})

@app.route('/api/status/<username>')
def status(username):
    if username in user_sessions:
        return jsonify({"connected": user_sessions[username]["connected"]})
    return jsonify({"connected": False})

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    username = data.get('username')
    message = data.get('message')
    
    if not username or username not in user_sessions:
        return jsonify({"error": "Invalid session"}), 400
    
    # Prompt engineering for Roblox Lua
    prompt = f"""
    You are Snowy AI, a Roblox script assistant. 
    The user wants: {message}
    Generate ONLY the Roblox Lua code that achieves this. 
    Do not include explanations, code blocks (```lua), or any text other than the script itself.
    If the request is not related to Roblox scripting, return a script that prints "Snowy AI: I can only help with Roblox scripts."
    """
    
    try:
        response = model.generate_content(prompt)
        lua_code = response.text.strip()
        
        # Store the command for the Roblox script to pick up
        user_sessions[username]["pending_command"] = lua_code
        
        return jsonify({"success": True, "message": "Command sent to Roblox!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Roblox API Endpoints ---

@app.route('/api/roblox/connect', methods=['POST'])
def roblox_connect():
    data = request.json
    username = data.get('username')
    if username:
        if username not in user_sessions:
            user_sessions[username] = {"connected": True, "pending_command": None}
        else:
            user_sessions[username]["connected"] = True
        return jsonify({"success": True})
    return jsonify({"success": False}), 400

@app.route('/api/roblox/poll/<username>')
def roblox_poll(username):
    if username in user_sessions and user_sessions[username]["pending_command"]:
        command = user_sessions[username]["pending_command"]
        user_sessions[username]["pending_command"] = None # Clear after sending
        return jsonify({"command": command})
    return jsonify({"command": None})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
