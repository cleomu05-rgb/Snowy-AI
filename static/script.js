let currentUser = "";

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const connectionBanner = document.getElementById('connection-banner');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');

loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim().toLowerCase();
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
        try {
            const response = await fetch(`/api/status/${currentUser}`);
            const data = await response.json();
            
            if (data.connected) {
                connectionBanner.classList.add('hidden');
            } else {
                connectionBanner.classList.remove('hidden');
            }
        } catch (e) {
            console.log("Waiting for connection...");
        }
        setTimeout(poll, 2000); // Check every 2 seconds
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
