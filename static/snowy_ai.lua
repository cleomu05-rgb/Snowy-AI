-- Snowy AI Roblox Script
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local username = _G.Username or "Unknown"
local apiUrl = _G.ApiUrl or "http://localhost:5000"

print("Snowy AI: Connecting as " .. username)

-- 1. Notify Backend of Connection
local function connect()
    local success, response = pcall(function()
        return HttpService:PostAsync(
            apiUrl .. "/api/roblox/connect",
            HttpService:JSONEncode({username = username}),
            Enum.HttpContentType.ApplicationJson
        )
    end)
    
    if success then
        print("Snowy AI: Connected to backend!")
    else
        warn("Snowy AI: Connection failed. Retrying...")
        task.wait(5)
        connect()
    end
end

-- 2. Poll for Commands
local function pollCommands()
    while true do
        local success, response = pcall(function()
            return HttpService:GetAsync(apiUrl .. "/api/roblox/poll/" .. username)
        end)
        
        if success then
            local data = HttpService:JSONDecode(response)
            if data and data.command then
                print("Snowy AI: Executing command...")
                local func, err = loadstring(data.command)
                if func then
                    local execSuccess, execErr = pcall(func)
                    if not execSuccess then
                        warn("Snowy AI: Execution Error: " .. tostring(execErr))
                    end
                else
                    warn("Snowy AI: Loadstring Error: " .. tostring(err))
                end
            end
        end
        task.wait(2) -- Poll every 2 seconds
    end
end

-- Start
task.spawn(connect)
task.spawn(pollCommands)

print("Snowy AI: System Initialized")
