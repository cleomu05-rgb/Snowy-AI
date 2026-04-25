from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os

app = Flask(__name__)

# --- CONFIGURATION API ---
API_KEY = os.environ.get("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

user_sessions = {}
# user_sessions structure:
# { "username": { "connected": bool, "pending": "code string", "staged_code": "code string", "game_data": {} } }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(force=True)
    username = data.get('username', '').lower()
    if username and username not in user_sessions:
        user_sessions[username] = {"connected": False, "pending": None, "staged_code": None, "game_data": None}
    return jsonify({"success": True})

@app.route('/api/status/<username>')
def status(username):
    user = user_sessions.get(username.lower())
    return jsonify({"connected": user["connected"] if user else False})

@app.route('/api/suggestions', methods=['GET'])
def get_suggestions():
    model_name = request.args.get('model', 'gemini-pro')
    try:
        dynamic_model = genai.GenerativeModel(model_name)
        prompt = "Generate 3 short button labels (max 3 words) for a Roblox exploit UI. Separate by commas. Only return the list."
        response = dynamic_model.generate_content(prompt)
        text = response.text.replace('"', '').replace('\n', '')
        suggestions = [s.strip() for s in text.split(',')]
        if len(suggestions) >= 3:
            return jsonify({"suggestions": suggestions[:3]})
    except Exception as e:
        pass
    return jsonify({"suggestions": ["Aimbot", "Infinite Jump", "God Mode"]})

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json(force=True)
    username = data.get('username', '').lower()
    message = data.get('message', '')
    model_name = data.get('model', 'gemini-pro')
    direct_execute = data.get('direct_execute', True)
    
    # Retrieve real game telemetry if available
    user_data = user_sessions.get(username, {})
    game_context = ""
    if user_data.get("game_data"):
        gd = user_data["game_data"]
        game_context = f"""
        [LIVE ROBLOX GAME CONTEXT]
        Game Name: {gd.get('gameName')}
        Creator: {gd.get('gameCreator')}
        Created: {gd.get('gameCreated')}
        PlaceId: {gd.get('placeId')}
        Description: {gd.get('gameDescription')}
        
        [WORKSPACE PREVIEW (Top 15 items)]:
        {', '.join(gd.get('workspacePreview', []))}
        
        [REMOTE EVENTS PREVIEW]:
        {', '.join(gd.get('remotePreview', []))}
        """
    
    wants_file = "file" in message.lower() or ".lua" in message.lower() or ".txt" in message.lower()

    prompt = f"""
    You are Snowy AI, a highly advanced Roblox exploit generator and game analyzer (similar to Antigravity).
    The user wants: {message}
    
    Here is the REAL, live data from the user's current Roblox session:
    {game_context}
    
    You MUST format your response EXACTLY like this:
    RESPONSE: [Explain your analysis or what you created conversationally. USE THE REAL LIVE DATA provided above to prove you are analyzing their specific game. For example, mention the game's actual name, creator, or specific Remotes/Objects found in the preview.]
    CODE:
    ```lua
    -- Write your Lua code here
    ```
    
    RULES:
    1. If the user asks for "game info", use the [LIVE ROBLOX GAME CONTEXT] provided to give them the exact Name, Creator, and details of what they are playing right now.
    2. If the user asks to "explore" or "analyze", write a Lua script that targets the specific objects or Remotes listed in the preview, and print results using `print("ANALYZED : Found -> " .. item.Name)`
    3. The CODE section must contain ONLY valid Lua code. No markdown outside the block.
    4. Write efficient and working exploit code for modern executors.
    """
    
    try:
        dynamic_model = genai.GenerativeModel(model_name)
        response = dynamic_model.generate_content(prompt)
        text = response.text
        
        reply_message = "Command sent to Roblox!"
        lua_code = ""
        
        if "CODE:" in text:
            parts = text.split("CODE:")
            reply_message = parts[0].replace("RESPONSE:", "").strip()
            lua_code = parts[1].replace("```lua", "").replace("```", "").strip()
        else:
            reply_message = "Here is what I generated:"
            if "```lua" in text:
                lua_code = text.split("```lua")[1].split("```")[0].strip()
            else:
                lua_code = text.strip()
                
        download_data = None
        if wants_file:
            download_data = {
                "filename": "snowy_ai_script.lua",
                "content": lua_code
            }
            reply_message += "\n(I have also generated the file for you to download!)"

        if direct_execute:
            user_sessions[username]["pending"] = lua_code
        else:
            user_sessions[username]["staged_code"] = lua_code
            
        return jsonify({
            "success": True, 
            "message": reply_message,
            "has_code": bool(lua_code),
            "download_file": download_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/authorize_execute', methods=['POST'])
def authorize_execute():
    data = request.get_json(force=True)
    username = data.get('username', '').lower()
    
    if username in user_sessions and user_sessions[username].get("staged_code"):
        user_sessions[username]["pending"] = user_sessions[username]["staged_code"]
        user_sessions[username]["staged_code"] = None
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "No staged code found"})

@app.route('/api/roblox/connect', methods=['POST'])
def rb_connect():
    data = request.get_json(force=True)
    username = data.get('username', '').lower()
    if not username:
        return jsonify({"error": "No username provided"}), 400
        
    if username in user_sessions:
        user_sessions[username]["connected"] = True
        user_sessions[username]["game_data"] = data
    else:
        user_sessions[username] = {"connected": True, "pending": None, "staged_code": None, "game_data": data}
    return jsonify({"success": True})

@app.route('/api/roblox/poll/<username>')
def rb_poll(username):
    user = user_sessions.get(username.lower())
    if user and user.get("pending"):
        cmd = user["pending"]
        user["pending"] = None
        return jsonify({"command": cmd})
    return jsonify({"command": None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
