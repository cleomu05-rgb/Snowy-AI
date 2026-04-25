let currentUser = "";

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const connectionBanner = document.getElementById('connection-banner');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const copyScriptBtn = document.getElementById('copy-script-btn');

loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    if (username) {
        currentUser = username;
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await response.json();
        
        if (data.success) {
            loginScreen.classList.add('hidden');
            chatScreen.classList.remove('hidden');
            startStatusPolling();
        }
    }
});

async function startStatusPolling() {
    const poll = async () => {
        if (!currentUser) return;
        const response = await fetch(`/api/status/${currentUser}`);
        const data = await response.json();
        
        if (data.connected) {
            connectionBanner.classList.add('hidden');
        } else {
            connectionBanner.classList.remove('hidden');
        }
        setTimeout(poll, 3000);
    };
    poll();
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || !currentUser) return;

    addMessage(message, 'user');
    chatInput.value = '';

    // Add thinking message
    const thinkingId = 'thinking-' + Date.now();
    addMessage("Snowy is thinking...", 'ai', thinkingId);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, message })
        });
        
        const data = await response.json();
        
        // Remove thinking message
        document.getElementById(thinkingId).remove();

        if (data.success) {
            addMessage(data.message, 'ai');
        } else {
            addMessage("Error: " + data.error, 'ai');
        }
    } catch (e) {
        document.getElementById(thinkingId).remove();
        addMessage("Connection error. Is the server running?", 'ai');
    }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function addMessage(text, sender, id = null) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    if (id) div.id = id;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

copyScriptBtn.addEventListener('click', () => {
    // Generate the script dynamically based on the current domain
    const host = window.location.origin;
    const script = `_G.Username = "${currentUser}"
_G.ApiUrl = "${host}"
loadstring(game:HttpGet("${host}/static/snowy_ai.lua"))()`;
    
    navigator.clipboard.writeText(script).then(() => {
        copyScriptBtn.textContent = "Copied!";
        setTimeout(() => {
            copyScriptBtn.textContent = "Copy";
        }, 2000);
    });
});
