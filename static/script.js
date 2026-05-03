let currentUser = "";
let hasShownNotification = false;
let uploadedFileContent = null;
let currentChatId = null;
let userChats = {};
let currentGameName = "";
let currentWorkspaceSample = "";
let currentWorkspaceItems = [];
let currentInventoryItems = [];

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
const fixOnThumbsToggle = document.getElementById('fix-on-thumbs-toggle');
const uiMethodSelect = document.getElementById('ui-method-select');
const generatingSpeedSlider = document.getElementById('generating-speed');
const speedValueDisplay = document.getElementById('speed-value');
const doubleVerifyToggle = document.getElementById('double-verify-toggle');
const deepAnalysisToggle = document.getElementById('deep-analysis-toggle');

let lastRobloxErrorTime = 0;

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

// --- CHAT INPUT LOGIC ---
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
});

// --- SETTINGS UPDATES ---
generatingSpeedSlider.addEventListener('input', (e) => {
    speedValueDisplay.textContent = e.target.value;
});

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
                        currentWorkspaceItems = data.workspace_preview.map(item => item.replace(/\[.*?\]\s*/g, '').split(' (')[0]);
                        currentWorkspaceSample = currentWorkspaceItems[0];
                    } else {
                        currentWorkspaceSample = "Workspace";
                        currentWorkspaceItems = [];
                    }

                    if (data.inventory_preview && data.inventory_preview.length > 0) {
                        currentInventoryItems = data.inventory_preview.map(item => item.split(' (')[0]);
                    } else {
                        currentInventoryItems = [];
                    }

                    if (data.game_data.user_img) {
                        document.getElementById('user-avatar').src = data.game_data.user_img;
                    }
                    if (data.game_data.game_img) {
                        document.getElementById('game-icon').src = data.game_data.game_img;
                    }
                }

                // Check for Roblox Errors (Double Verification)
                if (data.last_error && data.last_error.time > lastRobloxErrorTime) {
                    lastRobloxErrorTime = data.last_error.time;
                    console.warn("Roblox Error Detected:", data.last_error.message);
                    
                    if (doubleVerifyToggle.checked && lastAICodeContent) {
                        // In-place Fix
                        lastAIResponseContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const errorOverlay = document.createElement('div');
                        errorOverlay.className = 'error-overlay';
                        errorOverlay.innerHTML = `<i class="fas fa-magic"></i> Error detected: ${data.last_error.message}<br>Auto-fixing in place...`;
                        lastAIResponseContainer.appendChild(errorOverlay);
                        
                        setTimeout(async () => {
                            errorOverlay.remove();
                            // Trigger the fix but target the existing container
                            await triggerInPlaceFix(data.last_error.message, data.last_error.code);
                        }, 2000);
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
function createThinkingBlock(id, userQuery = "") {
    const div = document.createElement('div');
    div.classList.add('ai-thinking-block');
    div.id = id;
    
    const title = document.createElement('div');
    title.classList.add('thinking-title');
    title.innerHTML = `
        <i class="fas fa-chevron-down"></i>
        thinking... <span id="timer-${id}">0.0s</span>
    `;
    
    const logs = document.createElement('div');
    logs.classList.add('thinking-logs');
    
    div.appendChild(title);
    div.appendChild(logs);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Initial Deep Analysis Logs (Simulated for flavor but using real data)
    if (deepAnalysisToggle.checked) {
        const query = userQuery.toLowerCase();
        let primaryTarget = "relevant objects";
        if (query.includes("plot")) primaryTarget = "Plots & Bases";
        else if (query.includes("player") || query.includes("esp")) primaryTarget = "Players & Entities";
        else if (query.includes("coin") || query.includes("money") || query.includes("treasure")) primaryTarget = "Currency & Items";
        else if (query.includes("remote") || query.includes("event")) primaryTarget = "Remote Events";

        // Smart Discovery for logs
        let foundTool = "Empty Inventory";
        if (currentInventoryItems.length > 0) {
            const match = currentInventoryItems.find(t => query.includes(t.toLowerCase()));
            foundTool = match || currentInventoryItems[0];
        }

        let analyzedObj = currentWorkspaceSample || "Workspace";
        if (currentWorkspaceItems.length > 0) {
            const match = currentWorkspaceItems.find(i => query.includes(i.toLowerCase()));
            analyzedObj = match || currentWorkspaceItems[0];
        }

        const deepLogs = [
            `Analyzing hierarchy of ${analyzedObj}...`,
            `Scanning for ${primaryTarget}...`,
            `Searching for tools in Backpack...`,
            `Found: ${foundTool}`,
            `Mapping execution path for request...`
        ];
        
        let logIdx = 0;
        const deepLogInterval = setInterval(() => {
            if (logIdx < deepLogs.length) {
                const p = document.createElement('div');
                p.style.fontSize = '0.75rem';
                p.style.color = '#4b5563';
                p.style.marginBottom = '2px';
                p.textContent = `> ${deepLogs[logIdx]}`;
                logs.appendChild(p);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                logIdx++;
            } else {
                clearInterval(deepLogInterval);
            }
        }, 800);
    }

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const timerSpan = document.getElementById(`timer-${id}`);
        if (timerSpan) timerSpan.textContent = elapsed + 's';
    }, 100);
    
    return {
        timerInterval,
        logsContainer: logs,
        id: id
    };
}

async function renderThoughts(thinkingObj, thoughtsText) {
    const logs = thinkingObj.logsContainer;
    if (!thoughtsText) return;

    const sections = thoughtsText.split('###').filter(s => s.trim() !== '');
    
    for (let section of sections) {
        const lines = section.split('\n');
        const headerText = lines[0].trim();
        const bodyText = lines.slice(1).join('\n').trim();

        const sectionDiv = document.createElement('div');
        sectionDiv.classList.add('thought-section');
        
        const header = document.createElement('div');
        header.classList.add('thought-header');
        header.textContent = headerText;
        
        const body = document.createElement('div');
        body.classList.add('thought-body');
        
        sectionDiv.appendChild(header);
        sectionDiv.appendChild(body);
        logs.appendChild(sectionDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Typing effect for the body
        await streamText(body, bodyText, 5);
        await new Promise(r => setTimeout(r, 200));
    }
}

let lastAIResponseContainer = null;
let lastAICodeContent = null;

async function streamText(element, text) {
    const speed = parseInt(generatingSpeedSlider.value);
    const isAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 100;

    if (speed >= 10) {
        element.innerHTML = text.replace(/\n/g, '<br>');
        if (isAtBottom) chatMessages.scrollTop = chatMessages.scrollHeight;
        return;
    }
    
    const delay = Math.max(0, 50 - (speed * 5));
    
    element.innerHTML = '';
    for (let char of text) {
        if (char === '\n') {
            element.appendChild(document.createElement('br'));
        } else {
            element.innerHTML += char;
        }
        if (isAtBottom) chatMessages.scrollTop = chatMessages.scrollHeight;
        if (delay > 0) await new Promise(r => setTimeout(r, delay));
    }
}

// --- AGENTIC ACTION BAR ---
function createAgenticActions(code, messageId) {
    const actions = document.createElement('div');
    actions.classList.add('agentic-actions');
    
    const copyBtn = createIconButton('fa-copy', 'Copy', () => {
        navigator.clipboard.writeText(code);
        showToast("Copied to clipboard!");
    });
    
    const runBtn = createIconButton('fa-play', 'Run', async () => {
        const originalContent = runBtn.innerHTML;
        runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        await fetch('/api/authorize_execute', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: currentUser})
        });
        runBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => runBtn.innerHTML = originalContent, 2000);
        showToast("Script Executed on Roblox!");
    });
    runBtn.classList.add('run-btn');

    const upBtn = createIconButton('fa-thumbs-up', 'Good', () => {
        upBtn.classList.toggle('active');
        downBtn.classList.remove('active');
    });

    const downBtn = createIconButton('fa-thumbs-down', 'Bad', () => {
        downBtn.classList.toggle('active');
        upBtn.classList.remove('active');
        if (fixOnThumbsToggle.checked) {
            chatInput.value = "The previous script didn't work. Please fix it and make it better.";
            sendMessage();
        }
    });
    downBtn.classList.add('thumbs-down');

    const refreshBtn = createIconButton('fa-sync-alt', 'Regenerate', () => {
        chatInput.value = "Regenerate that script, make it even more OP and fix any potential bugs.";
        sendMessage();
    });

    actions.appendChild(copyBtn);
    actions.appendChild(runBtn);
    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(refreshBtn);
    
    return actions;
}

function createIconButton(iconClass, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'agent-icon-btn';
    btn.title = title;
    btn.innerHTML = `<i class="fas ${iconClass}"></i>`;
    btn.onclick = onClick;
    return btn;
}

function showToast(text) {
    notificationToast.querySelector('span').textContent = text;
    notificationToast.classList.remove('hidden');
    notificationToast.classList.add('show');
    setTimeout(() => {
        notificationToast.classList.remove('show');
        setTimeout(() => notificationToast.classList.add('hidden'), 500);
    }, 2000);
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
    const thinkingObj = createThinkingBlock(thinkingId, messageText);

    const selectedModel = document.getElementById('model-select').value;
    const fastMode = fastModeToggle.checked;
    const directExecute = directExecuteToggle.checked;
    const uiMethod = uiMethodSelect.value;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: currentUser, 
                message: fullMessage, 
                model: selectedModel,
                fast_mode: fastMode,
                direct_execute: directExecute,
                ui_method: uiMethod
            })
        });
        
        const data = await response.json();
        
        clearInterval(thinkingObj.timerInterval);

        if (data.success) {
            // Render Thoughts if any
            if (data.thoughts) {
                await renderThoughts(thinkingObj, data.thoughts);
            } else {
                document.getElementById(thinkingObj.id).remove();
            }

            let messageDiv = addMessage("", 'ai');
            const textSpan = messageDiv.querySelector('span');
            
            // Stream the conversational message
            if (data.message) {
                await streamText(textSpan, data.message, 15);
            }

            // Stream the code if any
            if (data.has_code) {
                const codeContainer = document.createElement('div');
                codeContainer.classList.add('code-stream-container');
                const codeContent = document.createElement('div');
                codeContent.classList.add('code-stream-content');
                codeContainer.appendChild(codeContent);
                messageDiv.appendChild(codeContainer);
                
                // Store containers for potential in-place fixing
                lastAIResponseContainer = messageDiv;
                lastAICodeContent = codeContent;
                
                const codeToStream = data.lua_code || "-- Script ready for execution.";
                await streamText(codeContent, codeToStream, 5);
                
                // Add action bar
                messageDiv.appendChild(createAgenticActions(codeToStream, thinkingObj.id));
            } else if (data.message) {
                lastAIResponseContainer = messageDiv;
                lastAICodeContent = null;
            }

        } else {
            document.getElementById(thinkingObj.id).remove();
            addMessage("Error: " + data.error, 'ai');
        }
    } catch (e) {
        if (thinkingObj) clearInterval(thinkingObj.timerInterval);
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
    if (text) {
        textNode.innerHTML = text.replace(/\n/g, '<br>');
    }
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
async function triggerInPlaceFix(errorMsg, failedCode) {
    if (!lastAICodeContent) return;
    
    // Clear the code and show a "fixing" animation
    lastAICodeContent.innerHTML = "<i class='fas fa-sync fa-spin'></i> Analyzing error...";
    
    const response = await fetch('/api/chat', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username: currentUser, 
            message: `FIX THIS ERROR: ${errorMsg}\n\nFAILED CODE:\n${failedCode}`, 
            model: document.getElementById('model-select').value,
            fast_mode: fastModeToggle.checked,
            direct_execute: directExecuteToggle.checked,
            ui_method: uiMethodSelect.value
        })
    });
    
    const data = await response.json();
    if (data.success && data.lua_code) {
        // Stream the fix into the SAME container
        await streamText(lastAICodeContent, data.lua_code);
        // Update the action bar if needed (optional)
        showToast("Script Auto-Fixed!");
    }
}
