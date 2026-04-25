let currentUser = "";
let hasShownNotification = false;

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const connectionBanner = document.getElementById('connection-banner');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const copyScriptBtn = document.getElementById('copy-script-btn');
const notificationToast = document.getElementById('notification-toast');
const suggestionsContainer = document.getElementById('suggestions-container');

// Show notification toast
function showNotification() {
    if (hasShownNotification) return;
    hasShownNotification = true;
    notificationToast.classList.remove('hidden');
    // A small delay before animating in
    setTimeout(() => {
        notificationToast.classList.add('show');
    }, 10);
    
    // Hide after 4 seconds
    setTimeout(() => {
        notificationToast.classList.remove('show');
        setTimeout(() => {
            notificationToast.classList.add('hidden');
        }, 500); // Wait for transition
    }, 4000);
}

// Fetch dynamic suggestions
async function loadSuggestions() {
    try {
        const selectedModel = document.getElementById('model-select').value;
        const response = await fetch(`/api/suggestions?model=${selectedModel}`);
        const data = await response.json();
        
        suggestionsContainer.innerHTML = ''; // Clear loading
        
        data.suggestions.forEach(suggestion => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = suggestion;
            btn.addEventListener('click', () => {
                chatInput.value = suggestion;
                sendMessage();
            });
            suggestionsContainer.appendChild(btn);
        });
    } catch (e) {
        console.error("Failed to load suggestions", e);
    }
}


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
            loadSuggestions(); // Load the AI suggestions
        }
    }
});

// Reload suggestions if the model is changed
document.getElementById('model-select').addEventListener('change', () => {
    if (currentUser) {
        suggestionsContainer.innerHTML = '<button class="suggestion-btn">Loading...</button>';
        loadSuggestions();
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
                showNotification(); // Show the toast notification
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

    const selectedModel = document.getElementById('model-select').value;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, message, model: selectedModel })
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

// Custom copy button logic for the new Github link
copyScriptBtn.addEventListener('click', () => {
    const scriptToCopy = `loadstring(game:HttpGet("https://raw.githubusercontent.com/cleomu05-rgb/script/refs/heads/main/roblox/antigravity"))()`;
    
    navigator.clipboard.writeText(scriptToCopy).then(() => {
        copyScriptBtn.textContent = "Copied!";
        setTimeout(() => {
            copyScriptBtn.textContent = "Copy";
        }, 2000);
    });
});
