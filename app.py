from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
import urllib.request
import json

import time

app = Flask(__name__)

# --- CONFIGURATION API ---
API_KEY = os.environ.get("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

user_sessions = {}
# user_sessions structure:
# { "username": { "connected": bool, "last_poll": 0, "pending": "code string", "staged_code": "code string", "game_data": {} } }

def get_roblox_thumbnails(user_id, place_id):
    user_img = "https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/150/150/AvatarHeadshot/Png" # fallback
    game_img = "https://tr.rbxcdn.com/53eb9b17fe1432a809c73a13889b5006/150/150/Image/Png" # fallback
    try:
        if user_id:
            req = urllib.request.Request(
                f"https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds={user_id}&size=150x150&format=Png&isCircular=true",
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            resp = urllib.request.urlopen(req, timeout=3)
            res = json.loads(resp.read())
            if res.get('data') and len(res['data']) > 0:
                user_img = res['data'][0]['imageUrl']
    except Exception as e:
        print("User img error", e)
        
    try:
        if place_id:
            req = urllib.request.Request(
                f"https://thumbnails.roblox.com/v1/places/gameicons?placeIds={place_id}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false",
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            resp = urllib.request.urlopen(req, timeout=3)
            res = json.loads(resp.read())
            if res.get('data') and len(res['data']) > 0:
                game_img = res['data'][0]['imageUrl']
    except Exception as e:
        print("Game img error", e)
        
    return user_img, game_img

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(force=True)
    username = data.get('username', '').lower()
    if username and username not in user_sessions:
        user_sessions[username] = {"connected": False, "last_poll": 0, "pending": None, "staged_code": None, "game_data": None}
    return jsonify({"success": True})

@app.route('/api/status/<username>')
def status(username):
    user = user_sessions.get(username.lower())
    if not user:
        return jsonify({"connected": False})
        
    if user.get("last_poll", 0) > 0 and time.time() - user["last_poll"] > 10:
        user["connected"] = False
        
    response_data = {"connected": user["connected"]}
    if user["connected"] and user.get("game_data"):
        response_data["game_data"] = {
            "gameName": user["game_data"].get("gameName", "Unknown Game"),
            "user_img": user["game_data"].get("user_img", ""),
            "game_img": user["game_data"].get("game_img", "")
        }
    return jsonify(response_data)

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
    no_talk = data.get('no_talk', False)
    
    user_data = user_sessions.get(username, {})
    game_context = ""
    game_name_for_search = "Roblox"
    
    if user_data.get("game_data"):
        gd = user_data["game_data"]
        game_name_for_search = gd.get('gameName', 'Roblox')
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

    if no_talk:
        response_format = "RESPONSE: [Executed]"
        extra_rule = "5. You are in NO TALK MODE. Do NOT provide any conversational text, explanations, or warnings. You must ONLY output `RESPONSE: [Executed]` followed by the CODE block containing the exploit."
    else:
        response_format = "RESPONSE: [Explain your analysis or what you created conversationally.]"
        extra_rule = ""

    prompt = f"""
    You are Snowy AI, a highly advanced Roblox exploit generator and game analyzer (similar to Antigravity).
    The user wants: {message}
    
    Here is the REAL, live data from the user's current Roblox session:
    {game_context}
    
    You MUST format your response EXACTLY like this:
    {response_format}
    CODE:
    ```lua
    -- Write your Lua code here
    ```
    
    RULES:
    1. If the user asks for "game info" or information about the game, USE YOUR VAST INTERNET KNOWLEDGE to explain the Roblox game "{game_name_for_search}". Tell them the goal of the game, creator info, release date, and general tips. If the LIVE CONTEXT above is valid, incorporate it. DO NOT just say "I don't have this data". You are a smart AI, you know what {game_name_for_search} is.
    2. If the user asks to "explore" or "analyze", write a Lua script that targets the specific objects or Remotes listed in the preview, and print results using `print("ANALYZED : Found -> " .. item.Name)`
    3. The CODE section must contain ONLY valid Lua code. No markdown outside the block.
    4. Write efficient and working exploit code for modern executors.
    {extra_rule}
    """
    
    try:
        if "step" in model_name.lower():
            step_key = os.environ.get("STEPFUN_KEY")
            if not step_key:
                return jsonify({"error": "StepFun API Key not configured. Please set STEPFUN_KEY in Render."}), 500
            
            try:
                from openai import OpenAI
                client = OpenAI(api_key=step_key, base_url="https://api.stepfun.com/v1")
            except ImportError:
                return jsonify({"error": "openai package missing. Check requirements.txt"}), 500
                
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            text = response.choices[0].message.content
        elif "gpt" in model_name.lower():
            openai_key = os.environ.get("OPENAI_KEY")
            if not openai_key:
                return jsonify({"error": "OpenAI API Key not configured. Please set OPENAI_KEY in Render."}), 500
            
            try:
                from openai import OpenAI
                client = OpenAI(api_key=openai_key)
            except ImportError:
                return jsonify({"error": "openai package missing. Check requirements.txt"}), 500
                
            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            text = response.choices[0].message.content
        else:
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
    user_id = data.get('userId')
    place_id = data.get('placeId')
    
    if not username:
        return jsonify({"error": "No username provided"}), 400
        
    # Fetch profile and game images
    user_img, game_img = get_roblox_thumbnails(user_id, place_id)
    data["user_img"] = user_img
    data["game_img"] = game_img
        
    if username in user_sessions:
        user_sessions[username]["connected"] = True
        user_sessions[username]["last_poll"] = time.time()
        user_sessions[username]["game_data"] = data
    else:
        user_sessions[username] = {"connected": True, "last_poll": time.time(), "pending": None, "staged_code": None, "game_data": data}
    return jsonify({"success": True})

@app.route('/api/roblox/poll/<username>')
def rb_poll(username):
    user = user_sessions.get(username.lower())
    if user:
        user["last_poll"] = time.time()
        user["connected"] = True
        if user.get("pending"):
            cmd = user["pending"]
            user["pending"] = None
            return jsonify({"command": cmd})
    return jsonify({"command": None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
