let currentUser = "";
let hasShownNotification = false;
let uploadedFileContent = null;

// UI Elements
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

// Settings Elements
const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const fastModeToggle = document.getElementById('fast-mode-toggle');
const directExecuteToggle = document.getElementById('direct-execute-toggle');

// File Upload Elements
const fileUpload = document.getElementById('file-upload');
const filePreview = document.getElementById('file-preview');

// Settings Modal Logic
openSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

// File Upload Logic
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            uploadedFileContent = `[FILE CONTENT - ${file.name}]\n${evt.target.result}`;
            filePreview.textContent = `Attached: ${file.name}`;
            filePreview.classList.remove('hidden');
        };
        reader.readAsText(file);
    }
});

// Show notification toast
function showNotification() {
    if (hasShownNotification) return;
    hasShownNotification = true;
    notificationToast.classList.remove('hidden');
    setTimeout(() => { notificationToast.classList.add('show'); }, 10);
    setTimeout(() => {
        notificationToast.classList.remove('show');
        setTimeout(() => { notificationToast.classList.add('hidden'); }, 500);
    }, 4000);
}

// Fetch dynamic suggestions
async function loadSuggestions() {
    try {
        const selectedModel = document.getElementById('model-select').value;
        const response = await fetch(`/api/suggestions?model=${selectedModel}`);
        const data = await response.json();
        
        suggestionsContainer.innerHTML = '';
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
            loadSuggestions();
        }
    }
});

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
                showNotification();
                
                // Update live profile
                if (data.game_data) {
                    document.getElementById('live-telemetry').classList.remove('hidden');
                    document.getElementById('user-name-display').textContent = '@' + currentUser;
                    document.getElementById('game-name-display').textContent = data.game_data.gameName;
                    
                    if (data.game_data.user_img) {
                        document.getElementById('user-avatar').src = data.game_data.user_img;
                    }
                    if (data.game_data.game_img) {
                        document.getElementById('game-icon').src = data.game_data.game_img;
                    }
                }
                
            } else {
                connectionBanner.classList.remove('hidden');
                document.getElementById('live-telemetry').classList.add('hidden');
            }
        } catch (e) {}
        setTimeout(poll, 2000);
    };
    poll();
}

function createThinkingBlock(id) {
    const div = document.createElement('div');
    div.classList.add('ai-thinking-block');
    div.id = id;
    
    const title = document.createElement('div');
    title.classList.add('thinking-title');
    title.innerHTML = `
        <div class="dot-wave"><span></span><span></span><span></span></div>
        Investigating
    `;
    
    const logs = document.createElement('div');
    logs.classList.add('thinking-logs');
    
    div.appendChild(title);
    div.appendChild(logs);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Simulate Antigravity logs
    const logMessages = [
        "USED 'roblox_search' Scanning environment...",
        "ANALYZED RemoteEvents loaded",
        "USED 'roblox_get_children' Opening Workspace...",
        "ANALYZED Looking for LocalScripts...",
        "USED 'roblox_get_properties' Checking variables...",
        "ANALYZED Compiling payload..."
    ];
    
    let index = 0;
    const logInterval = setInterval(() => {
        if (index < logMessages.length) {
            const p = document.createElement('div');
            p.classList.add('log-entry');
            if (logMessages[index].includes('USED')) p.classList.add('used');
            if (logMessages[index].includes('ANALYZED')) p.classList.add('analyzed');
            p.textContent = logMessages[index];
            logs.appendChild(p);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            index++;
        }
    }, 800);
    
    return logInterval;
}

function createMessageActions(text) {
    const actions = document.createElement('div');
    actions.classList.add('message-actions');
    
    // Copy
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
    copyBtn.onclick = () => navigator.clipboard.writeText(text);
    
    // Reply
    const replyBtn = document.createElement('button');
    replyBtn.className = 'action-btn';
    replyBtn.innerHTML = '<i class="fas fa-reply"></i> Reply';
    replyBtn.onclick = () => chatInput.focus();
    
    // Fix
    const fixBtn = document.createElement('button');
    fixBtn.className = 'action-btn';
    fixBtn.innerHTML = '<i class="fas fa-wrench"></i> Fix';
    fixBtn.onclick = () => {
        chatInput.value = "There is an error with this script. Fix it: ";
        chatInput.focus();
    };
    
    actions.appendChild(copyBtn);
    actions.appendChild(replyBtn);
    actions.appendChild(fixBtn);
    return actions;
}

async function sendMessage() {
    let messageText = chatInput.value.trim();
    if (!messageText && !uploadedFileContent) return;
    if (!currentUser) return;

    let fullMessage = messageText;
    if (uploadedFileContent) {
        fullMessage += "\n\n" + uploadedFileContent;
        uploadedFileContent = null;
        filePreview.classList.add('hidden');
    }

    addMessage(messageText || "[Attached File]", 'user');
    chatInput.value = '';

    const thinkingId = 'thinking-' + Date.now();
    const logInterval = createThinkingBlock(thinkingId);

    const selectedModel = document.getElementById('model-select').value;
    const fastMode = fastModeToggle.checked;
    const directExecute = directExecuteToggle.checked;
    const noTalk = document.getElementById('no-talk-toggle').checked;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: currentUser, 
                message: fullMessage, 
                model: selectedModel,
                fast_mode: fastMode,
                direct_execute: directExecute,
                no_talk: noTalk
            })
        });
        
        const data = await response.json();
        
        clearInterval(logInterval);
        document.getElementById(thinkingId).remove();

        if (data.success) {
            let finalMessage = data.message;
            let messageDiv = null;
            
            if (finalMessage.trim() !== "" && finalMessage.trim() !== "[Executed]") {
                messageDiv = addMessage(finalMessage, 'ai');
            } else if (!data.has_code) {
                messageDiv = addMessage("Done.", 'ai');
            } else {
                // If it's pure code and no_talk is on, just show a minimal response
                messageDiv = addMessage("Script Generated & Sent.", 'ai');
            }
            
            // Check if download was requested
            if (data.download_file) {
                downloadFile(data.download_file.filename, data.download_file.content);
                addMessage(`Saved ${data.download_file.filename} to your device.`, 'ai');
            }

            // If not direct execute, show authorize button
            if (!directExecute && data.has_code) {
                const authBtn = document.createElement('button');
                authBtn.className = 'chat-action-btn';
                authBtn.textContent = 'Authorize Execution on Roblox';
                authBtn.onclick = async () => {
                    authBtn.textContent = 'Executing...';
                    await fetch('/api/authorize_execute', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({username: currentUser})
                    });
                    authBtn.textContent = 'Executed!';
                    authBtn.disabled = true;
                };
                if (messageDiv) messageDiv.appendChild(authBtn);
            }

        } else {
            addMessage("Error: " + data.error, 'ai');
        }
    } catch (e) {
        clearInterval(logInterval);
        document.getElementById(thinkingId).remove();
        addMessage("Connection error. Is the server running?", 'ai');
    }
}

function downloadFile(filename, content) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function addMessage(text, sender, id = null) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    if (id) div.id = id;
    
    // Format text briefly (convert newlines)
    const textNode = document.createElement('span');
    textNode.innerHTML = text.replace(/\n/g, '<br>');
    div.appendChild(textNode);
    
    if (sender === 'ai') {
        div.appendChild(createMessageActions(text));
    }
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Custom copy button logic for the JNKIE API link
copyScriptBtn.addEventListener('click', () => {
    const scriptToCopy = `loadstring(game:HttpGet("https://raw.githubusercontent.com/cleomu05-rgb/script/refs/heads/main/roblox/antigravity"))()`;
    navigator.clipboard.writeText(scriptToCopy).then(() => {
        copyScriptBtn.textContent = "Copied!";
        setTimeout(() => { copyScriptBtn.textContent = "Copy"; }, 2000);
    });
});
