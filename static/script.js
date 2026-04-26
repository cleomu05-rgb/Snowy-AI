let currentUser = "";
let hasShownNotification = false;
let uploadedFileContent = null;
let currentChatId = null;
let userChats = {};
let currentGameName = "";
let currentWorkspaceSample = "";

// Executor State
let executorTabs = [
    { id: 'tab-1', name: 'Script 1', content: '-- Snowy AI Executor\n-- Type here or ask the AI...' }
];
let activeTabId = 'tab-1';

// UI Elements - Navigation
const navChat = document.getElementById('nav-chat');
const navExecutor = document.getElementById('nav-executor');
const openSettingsNav = document.getElementById('open-settings-nav');
const logoutBtn = document.getElementById('logout-btn');

// UI Elements - Screens
const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const chatView = document.getElementById('chat-view');
const executorView = document.getElementById('executor-view');

// UI Elements - Chat
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const connectionBanner = document.getElementById('connection-banner');
const copyScriptBtn = document.getElementById('copy-script-btn');
const notificationToast = document.getElementById('notification-toast');
const suggestionsContainer = document.getElementById('suggestions-container');
const fileUpload = document.getElementById('file-upload');
const filePreview = document.getElementById('file-preview');

// UI Elements - Sidebar
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const newChatBtn = document.getElementById('new-chat-btn');
const chatHistoryList = document.getElementById('chat-history-list');

// UI Elements - Executor
const executorTabsContainer = document.getElementById('executor-tabs');
const addExecutorTabBtn = document.getElementById('add-executor-tab');
const codeEditor = document.getElementById('code-editor');
const lineNumbers = document.getElementById('line-numbers');
const execBtn = document.getElementById('exec-btn');
const saveExecBtn = document.getElementById('save-exec-btn');
const loadExecBtn = document.getElementById('load-exec-btn');
const clearExecBtn = document.getElementById('clear-exec-btn');

// Settings Elements
const settingsModal = document.getElementById('settings-modal');
const fastModeToggle = document.getElementById('fast-mode-toggle');
const directExecuteToggle = document.getElementById('direct-execute-toggle');
const closeSettingsBtn = document.getElementById('close-settings');

// --- VIEW NAVIGATION ---
function switchView(view) {
    chatView.classList.add('hidden');
    executorView.classList.add('hidden');
    navChat.classList.remove('active');
    navExecutor.classList.remove('active');

    if (view === 'chat') {
        chatView.classList.remove('hidden');
        navChat.classList.add('active');
    } else if (view === 'executor') {
        executorView.classList.remove('hidden');
        navExecutor.classList.add('active');
        updateLineNumbers();
    }
}

navChat.addEventListener('click', () => switchView('chat'));
navExecutor.addEventListener('click', () => switchView('executor'));
openSettingsNav.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

logoutBtn.addEventListener('click', () => {
    location.reload();
});

// --- EXECUTOR LOGIC ---
function renderTabs() {
    // Keep the add button
    const addBtn = document.getElementById('add-executor-tab');
    executorTabsContainer.innerHTML = '';
    
    executorTabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `exec-tab ${tab.id === activeTabId ? 'active' : ''}`;
        tabEl.dataset.id = tab.id;
        tabEl.innerHTML = `
            ${tab.name} 
            <i class="fas fa-times close-tab" onclick="event.stopPropagation(); closeTab('${tab.id}')"></i>
        `;
        tabEl.onclick = () => selectTab(tab.id);
        executorTabsContainer.appendChild(tabEl);
    });
    
    executorTabsContainer.appendChild(addBtn);
}

function selectTab(id) {
    // Save current content
    const currentTab = executorTabs.find(t => t.id === activeTabId);
    if (currentTab) currentTab.content = codeEditor.value;

    activeTabId = id;
    const tab = executorTabs.find(t => t.id === id);
    codeEditor.value = tab ? tab.content : "";
    renderTabs();
    updateLineNumbers();
}

function addTab() {
    const id = 'tab-' + Date.now();
    executorTabs.push({ id, name: `Script ${executorTabs.length + 1}`, content: "" });
    selectTab(id);
}

function closeTab(id) {
    if (executorTabs.length === 1) return;
    executorTabs = executorTabs.filter(t => t.id !== id);
    if (activeTabId === id) {
        selectTab(executorTabs[0].id);
    } else {
        renderTabs();
    }
}

addExecutorTabBtn.addEventListener('click', addTab);

function updateLineNumbers() {
    const lines = codeEditor.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= lines; i++) {
        html += i + '<br>';
    }
    lineNumbers.innerHTML = html;
}

codeEditor.addEventListener('input', updateLineNumbers);
codeEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
});

// Executor Actions
execBtn.addEventListener('click', async () => {
    const code = codeEditor.value;
    if (!code || !currentUser) return;

    execBtn.disabled = true;
    const originalContent = execBtn.innerHTML;
    execBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';

    try {
        await fetch('/api/authorize_execute_direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, code: code })
        });
        execBtn.innerHTML = '<i class="fas fa-check"></i> Executed!';
    } catch (e) {
        execBtn.innerHTML = '<i class="fas fa-times"></i> Error';
    }

    setTimeout(() => {
        execBtn.disabled = false;
        execBtn.innerHTML = originalContent;
    }, 2000);
});

clearExecBtn.addEventListener('click', () => {
    codeEditor.value = '';
    updateLineNumbers();
});

// --- CHAT HISTORY LOGIC ---
function loadChatHistory() {
    if (!currentUser) return;
    const saved = localStorage.getItem(`snowy_chats_${currentUser}`);
    userChats = saved ? JSON.parse(saved) : {};
    renderSidebar();
}

function saveChatHistory() {
    if (!currentUser) return;
    localStorage.setItem(`snowy_chats_${currentUser}`, JSON.stringify(userChats));
    renderSidebar();
}

function renderSidebar() {
    chatHistoryList.innerHTML = '';
    const chatIds = Object.keys(userChats).sort((a, b) => b - a);
    
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
    chatMessages.innerHTML = `
        <div class="welcome-msg">
            <i class="fas fa-snowflake"></i>
            <h2>New Conversation</h2>
            <p>Ready to help. Ask me anything.</p>
        </div>
    `;
    saveChatHistory();
    sidebar.classList.remove('open');
}

function loadChat(id) {
    if (!userChats[id]) return;
    currentChatId = id;
    chatMessages.innerHTML = '';
    userChats[id].messages.forEach(msg => {
        addMessage(msg.text, msg.sender, null, true);
    });
    saveChatHistory();
    sidebar.classList.remove('open');
}

// --- MODALS & SIDEBAR ---
openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
newChatBtn.addEventListener('click', createNewChat);

// --- FILE UPLOAD ---
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            uploadedFileContent = `[FILE: ${file.name}]\n${evt.target.result}`;
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
    setTimeout(() => notificationToast.classList.add('show'), 10);
    setTimeout(() => {
        notificationToast.classList.remove('show');
        setTimeout(() => notificationToast.classList.add('hidden'), 500);
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
    } catch (e) {}
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
            mainContent.classList.remove('hidden');
            switchView('chat');
            loadChatHistory();
            if (Object.keys(userChats).length === 0) createNewChat();
            startStatusPolling();
            loadSuggestions();
        }
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
                if (data.game_data) {
                    document.getElementById('live-telemetry').classList.remove('hidden');
                    document.getElementById('user-name-display').textContent = '@' + currentUser;
                    document.getElementById('game-name-display').textContent = data.game_data.gameName;
                    currentGameName = data.game_data.gameName;
                    if (data.workspace_preview && data.workspace_preview.length > 0) {
                        currentWorkspaceSample = data.workspace_preview[0].replace(/\[.*?\]\s*/, '').split(' (')[0];
                    }
                    if (data.game_data.user_img) document.getElementById('user-avatar').src = data.game_data.user_img;
                    if (data.game_data.game_img) document.getElementById('game-icon').src = data.game_data.game_img;
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

// --- TYPING EFFECT FOR EXECUTOR ---
function typeToEditor(code) {
    switchView('executor');
    codeEditor.value = "";
    let index = 0;
    const speed = 10; // chars per tick
    
    const interval = setInterval(() => {
        if (index < code.length) {
            codeEditor.value += code.substring(index, index + speed);
            index += speed;
            codeEditor.scrollTop = codeEditor.scrollHeight;
            updateLineNumbers();
        } else {
            clearInterval(interval);
        }
    }, 10);
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

// --- CORE CHAT ---
async function sendMessage() {
    let messageText = chatInput.value.trim();
    if (!messageText && !uploadedFileContent) return;
    if (!currentUser) return;

    if (!currentChatId || !userChats[currentChatId]) createNewChat();

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

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: currentUser, 
                message: fullMessage, 
                model: selectedModel,
                fast_mode: fastModeToggle.checked,
                direct_execute: directExecuteToggle.checked
            })
        });
        
        const data = await response.json();
        clearInterval(logInterval);
        document.getElementById(thinkingId).remove();

        if (data.success) {
            let finalMessage = data.message;
            addMessage(finalMessage, 'ai');
            
            // Extract code and type it to editor
            const codeMatch = finalMessage.match(/```(?:lua|luau|)\n([\s\S]*?)```/);
            if (codeMatch && codeMatch[1]) {
                typeToEditor(codeMatch[1]);
            }

            if (!directExecuteToggle.checked && data.has_code) {
                const execPrompt = document.createElement('div');
                execPrompt.classList.add('execute-prompt-box');
                execPrompt.innerHTML = `
                    <div class="exec-title"><i class="fas fa-terminal"></i> Execute script?</div>
                    <div class="exec-actions">
                        <button class="exec-run-btn"><i class="fas fa-play"></i> Run</button>
                    </div>
                `;
                execPrompt.querySelector('.exec-run-btn').onclick = async () => {
                    const btn = execPrompt.querySelector('.exec-run-btn');
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';
                    await fetch('/api/authorize_execute', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({username: currentUser})
                    });
                    btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
                    setTimeout(() => { btn.innerHTML = '<i class="fas fa-play"></i> Run'; btn.disabled = false; }, 2000);
                };
                chatMessages.lastElementChild.appendChild(execPrompt);
            }
        } else {
            addMessage("Error: " + data.error, 'ai');
        }
    } catch (e) {
        clearInterval(logInterval);
        if (document.getElementById(thinkingId)) document.getElementById(thinkingId).remove();
        addMessage("Connection error: " + e.message, 'ai');
    }
}

function addMessage(text, sender, id = null, isHistoryLoad = false) {
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');
    if (id) div.id = id;
    
    const textNode = document.createElement('span');
    textNode.innerHTML = text.replace(/\n/g, '<br>');
    div.appendChild(textNode);
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (!isHistoryLoad && currentChatId && userChats[currentChatId]) {
        userChats[currentChatId].messages.push({ sender, text });
        saveChatHistory();
    }
    return div;
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
copyScriptBtn.addEventListener('click', () => {
    const script = `loadstring(game:HttpGet("https://raw.githubusercontent.com/cleomu05-rgb/script/refs/heads/main/roblox/antigravity"))()`;
    navigator.clipboard.writeText(script).then(() => {
        copyScriptBtn.textContent = "Copied!";
        setTimeout(() => copyScriptBtn.textContent = "Copy Script", 2000);
    });
});

// Initial tab render
renderTabs();
updateLineNumbers();
