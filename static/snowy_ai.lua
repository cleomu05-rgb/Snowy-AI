-- Snowy AI Roblox Script (Version Exploit / Executor)
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- Fonction HTTP universelle pour les exécuteurs (Synapse, Wave, Krnl, etc.)
local requestFunc = (syn and syn.request) or (http and http.request) or http_request or (fluxus and fluxus.request) or request

local player = Players.LocalPlayer
local username = player.Name
local apiUrl = "https://snowy-ai.onrender.com"

print("Snowy AI: Initialisation pour " .. username)

local function connect()
    local success = false
    
    if requestFunc then
        local res = requestFunc({
            Url = apiUrl .. "/api/roblox/connect",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json"
            },
            Body = HttpService:JSONEncode({username = username})
        })
        success = res.Success
    else
        local s, r = pcall(function()
            return HttpService:PostAsync(
                apiUrl .. "/api/roblox/connect",
                HttpService:JSONEncode({username = username}),
                Enum.HttpContentType.ApplicationJson
            )
        end)
        success = s
    end
    
    if success then
        print("Snowy AI: Connecté au site avec succès !")
    else
        warn("Snowy AI: Échec de connexion au site. Vérifie ton lien ou relance l'exécuteur.")
        task.wait(5)
        connect()
    end
end

local function pollCommands()
    while true do
        local success, body = false, nil
        
        if requestFunc then
            local res = requestFunc({
                Url = apiUrl .. "/api/roblox/poll/" .. username,
                Method = "GET"
            })
            success = res.Success
            body = res.Body
        else
            local s, r = pcall(function()
                return HttpService:GetAsync(apiUrl .. "/api/roblox/poll/" .. username)
            end)
            success = s
            body = r
        end
        
        if success and body then
            local data = HttpService:JSONDecode(body)
            if data and data.command then
                print("Snowy AI: ANALYSED Request...")
                local func, err = loadstring(data.command)
                if func then
                    pcall(func)
                    print("Snowy AI: EXECUTED")
                else
                    warn("Snowy AI: Compilation Error - " .. tostring(err))
                end
            end
        end
        task.wait(2)
    end
end

task.spawn(connect)
task.spawn(pollCommands)
print("Snowy AI: Prêt et en attente !")
