-- Snowy AI Roblox Script (Version Automatique)
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- Récupère automatiquement ton nom Roblox
local player = Players.LocalPlayer
local username = player.Name
local apiUrl = "https://snowy-ai.onrender.com"

print("Snowy AI: Initialisation pour " .. username)

local function connect()
    local success, response = pcall(function()
        return HttpService:PostAsync(
            apiUrl .. "/api/roblox/connect",
            HttpService:JSONEncode({username = username}),
            Enum.HttpContentType.ApplicationJson
        )
    end)
    
    if success then
        print("Snowy AI: Connecté au site avec succès !")
    else
        warn("Snowy AI: Échec de connexion au site. Vérifie l'URL.")
        task.wait(5)
        connect()
    end
end

local function pollCommands()
    while true do
        local success, response = pcall(function()
            return HttpService:GetAsync(apiUrl .. "/api/roblox/poll/" .. username)
        end)
        
        if success then
            local data = HttpService:JSONDecode(response)
            if data and data.command then
                print("Snowy AI: Commande reçue !")
                local func, err = loadstring(data.command)
                if func then
                    pcall(func)
                end
            end
        end
        task.wait(2)
    end
end

task.spawn(connect)
task.spawn(pollCommands)
print("Snowy AI: Prêt et en attente !")
