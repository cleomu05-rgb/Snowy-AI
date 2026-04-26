let currentUser = "";
let hasShownNotification = false;
let uploadedFileContent = null;
let currentChatId = null;
let userChats = {};
let currentGameName = "";
let currentWorkspaceSample = "";

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

// Sidebar Elements
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const newChatBtn = document.getElementById('new-chat-btn');
const chatHistoryList = document.getElementById('chat-history-list');

// File Upload Elements
const fileUpload = document.getElementById('file-upload');
const filePreview = document.getElementById('file-preview');

// --- CHAT HISTORY LOGIC ---
function loadChatHistory() {
    if (!currentUser) return;
    const saved = localStorage.getItem(`snowy_chats_${currentUser}`);
    if (saved) {
        userChats = JSON.parse(saved);
    } else {
        userChats = {};
    }
    renderSidebar();
}

function saveChatHistory() {
    if (!currentUser) return;
    localStorage.setItem(`snowy_chats_${currentUser}`, JSON.stringify(userChats));
    renderSidebar();
}

function renderSidebar() {
    chatHistoryList.innerHTML = '';
    const chatIds = Object.keys(userChats).sort((a, b) => b - a); // sort by newest first
    
    chatIds.forEach(id => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `chat-item-container ${id === currentChatId ? 'active' : ''}`;
        
        const btn = document.createElement('button');
        btn.className = 'chat-item-btn';
        btn.textContent = userChats[id].title || "New Chat";
        btn.onclick = () => loadChat(id);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'chat-delete-btn';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(id);
        };
        
        itemDiv.appendChild(btn);
        itemDiv.appendChild(delBtn);
        chatHistoryList.appendChild(itemDiv);
    });
}

function deleteChat(id) {
    delete userChats[id];
    saveChatHistory();
    if (currentChatId === id) {
        const remainingChats = Object.keys(userChats);
        if (remainingChats.length > 0) {
            loadChat(remainingChats.sort((a, b) => b - a)[0]);
        } else {
            createNewChat();
        }
    }
}

function createNewChat() {
    currentChatId = Date.now().toString();
    userChats[currentChatId] = { title: "New Chat", messages: [] };
    chatMessages.innerHTML = ''; // clear UI
    saveChatHistory();
    sidebar.classList.remove('open');
}

function loadChat(id) {
    if (!userChats[id]) return;
    currentChatId = id;
    chatMessages.innerHTML = '';
    
    userChats[id].messages.forEach(msg => {
        addMessage(msg.text, msg.sender, null, true); // true = don't save to history again
    });
    
    saveChatHistory(); // updates active class in sidebar
    sidebar.classList.remove('open');
}

// --- MODALS & SIDEBAR ---
openSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
newChatBtn.addEventListener('click', createNewChat);

// --- FILE UPLOAD LOGIC ---
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

// --- NOTIFICATION ---
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

// --- SUGGESTIONS ---
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

// --- LOGIN ---
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
            loadChatHistory();
            if (Object.keys(userChats).length === 0) {
                createNewChat();
            } else {
                // Load most recent chat by default
                const chatIds = Object.keys(userChats).sort((a, b) => b - a);
                loadChat(chatIds[0]);
            }
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

// --- STATUS POLLING ---
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
                    currentGameName = data.game_data.gameName;
                    
                    if (data.workspace_preview && data.workspace_preview.length > 0) {
                        currentWorkspaceSample = data.workspace_preview[0].replace(/\[.*?\]\s*/, '').split(' (')[0];
                    } else {
                        currentWorkspaceSample = "Workspace";
                    }

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

// --- THINKING BLOCK ---
function createThinkingBlock(id) {
    const div = document.createElement('div');
    div.classList.add('ai-thinking-block');
    div.id = id;
    
    const title = document.createElement('div');
    title.classList.add('thinking-title');
    title.innerHTML = `
        <div class="dot-wave"><span></span><span></span><span></span></div>
        Investigating <span class="tools-count">14 tools</span>
    `;
    
    const tools = document.createElement('div');
    tools.classList.add('tools-pills');
    const toolNames = ['roblox_get_remotes', 'roblox_search', 'roblox_get_children x9', 'roblox_get_properties', 'project_write_file', 'roblox_execute'];
    toolNames.forEach(t => {
        const pill = document.createElement('span');
        pill.classList.add('tool-pill');
        pill.textContent = t;
        tools.appendChild(pill);
    });

    const stepsBox = document.createElement('div');
    stepsBox.classList.add('steps-box');
    stepsBox.innerHTML = `
        <div class="steps-header"><i class="fas fa-list"></i> Steps (4/4)</div>
        <div class="step-item"><i class="fas fa-check-circle"></i> Inspect live game context: ${currentGameName || 'Analyzing game...'}</div>
        <div class="step-item"><i class="fas fa-check-circle"></i> Map remotes, scripts, GUI, prompts, players</div>
        <div class="step-item"><i class="fas fa-check-circle"></i> Pick the best exploit path</div>
        <div class="step-item"><i class="fas fa-check-circle"></i> Build a strong targeted UI/tool</div>
    `;
    
    const logs = document.createElement('div');
    logs.classList.add('thinking-logs');
    
    div.appendChild(title);
    div.appendChild(tools);
    div.appendChild(stepsBox);
    div.appendChild(logs);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    const logMessages = [
        `ANALYZED Initiating deep scan on ${currentGameName || 'game'}...`,
        `USED 'roblox_get_children' Analyzing ${currentWorkspaceSample || 'Workspace'} hierarchy...`,
        "ANALYZED Identifying interactive ProximityPrompts and Models...",
        "USED 'roblox_get_remotes' Mapping network traffic and RemoteEvents...",
        "ANALYZED Potential entry point detected in ReplicatedStorage.",
        "USED 'roblox_execute' Compiling and staging exploit payload..."
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
    }, 600);
    
    return logInterval;
}

// --- MESSAGE ACTIONS ---
function createMessageActions(text) {
    const actions = document.createElement('div');
    actions.classList.add('message-actions');
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
    copyBtn.onclick = () => navigator.clipboard.writeText(text);
    
    const replyBtn = document.createElement('button');
    replyBtn.className = 'action-btn';
    replyBtn.innerHTML = '<i class="fas fa-reply"></i> Reply';
    replyBtn.onclick = () => chatInput.focus();
    
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

// --- CORE CHAT ---
async function sendMessage() {
    let messageText = chatInput.value.trim();
    if (!messageText && !uploadedFileContent) return;
    if (!currentUser) return;

    if (!currentChatId || !userChats[currentChatId]) {
        createNewChat();
    }

    // Set title of chat based on first message
    if (userChats[currentChatId].messages.length === 0) {
        userChats[currentChatId].title = messageText ? messageText.substring(0, 20) : "Attached File";
        renderSidebar();
    }

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

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: currentUser, 
                message: fullMessage, 
                model: selectedModel,
                fast_mode: fastMode,
                direct_execute: directExecute
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
                messageDiv = addMessage("Script Generated & Sent.", 'ai');
            }
            
            if (data.download_file) {
                downloadFile(data.download_file.filename, data.download_file.content);
                addMessage(`Saved ${data.download_file.filename} to your device.`, 'ai');
            }

            if (!directExecute && data.has_code) {
                const execPrompt = document.createElement('div');
                execPrompt.classList.add('execute-prompt-box');
                execPrompt.innerHTML = `
                    <div class="exec-title"><i class="fas fa-terminal"></i> Execute script?</div>
                    <div class="exec-actions">
                        <button class="exec-run-btn"><i class="fas fa-play"></i> Run</button>
                        <button class="exec-dismiss-btn"><i class="fas fa-times"></i> Dismiss</button>
                    </div>
                `;
                
                execPrompt.querySelector('.exec-run-btn').onclick = async () => {
                    const btn = execPrompt.querySelector('.exec-run-btn');
                    const originalText = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';
                    
                    await fetch('/api/authorize_execute', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({username: currentUser})
                    });
                    
                    btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                    setTimeout(() => { 
                        btn.innerHTML = originalText; 
                        btn.disabled = false;
                    }, 2000);
                };
                
                execPrompt.querySelector('.exec-dismiss-btn').onclick = () => {
                    execPrompt.remove();
                };
                
                if (messageDiv) messageDiv.appendChild(execPrompt);
            }

        } else {
            addMessage("Error: " + data.error, 'ai');
        }
    } catch (e) {
        clearInterval(logInterval);
        if (document.getElementById(thinkingId)) document.getElementById(thinkingId).remove();
        console.error("Chat Error:", e);
        addMessage("Connection error: " + e.message + ". Check if Render is still starting up or if the server crashed.", 'ai');
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

function addMessage(text, sender, id = null, isHistoryLoad = false) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    if (id) div.id = id;
    
    const textNode = document.createElement('span');
    textNode.innerHTML = text.replace(/\n/g, '<br>');
    div.appendChild(textNode);
    
    if (sender === 'ai') {
        div.appendChild(createMessageActions(text));
    }
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (!isHistoryLoad && currentChatId && userChats[currentChatId]) {
        userChats[currentChatId].messages.push({ sender, text });
        saveChatHistory();
    }
    
    return div;
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

copyScriptBtn.addEventListener('click', () => {
    const scriptToCopy = `loadstring(game:HttpGet("https://raw.githubusercontent.com/cleomu05-rgb/script/refs/heads/main/roblox/antigravity"))()`;
    navigator.clipboard.writeText(scriptToCopy).then(() => {
        copyScriptBtn.textContent = "Copied!";
        setTimeout(() => { copyScriptBtn.textContent = "Copy"; }, 2000);
    });
});
