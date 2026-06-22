-- Improved Snowy AI Character Modifiers Script
-- Fixed version with better error handling and game compatibility

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local CoreGui = game:GetService("CoreGui")

local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")

-- Improved Humanoid getter with better error handling
local function getHumanoid()
    local character = LocalPlayer.Character
    if not character then
        character = LocalPlayer.CharacterAdded:Wait()
    end
    
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then
        humanoid = character:WaitForChild("Humanoid", 5)
    end
    
    return character, humanoid
end

-- Create ScreenGui in PlayerGui (more reliable than CoreGui)
local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "SnowyAI_Modifiers"
ScreenGui.ResetOnSpawn = false
ScreenGui.Parent = PlayerGui

-- Main Frame
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Size = UDim2.new(0, 320, 0, 350)
MainFrame.Position = UDim2.new(0.5, -160, 0.5, -175)
MainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
MainFrame.BorderSizePixel = 0
MainFrame.Parent = ScreenGui
MainFrame.Active = true -- Make it interactive

-- Rounded corners
local UICorner = Instance.new("UICorner")
UICorner.CornerRadius = UDim.new(0, 12)
UICorner.Parent = MainFrame

-- Border
local UIStroke = Instance.new("UIStroke")
UIStroke.Color = Color3.fromRGB(60, 60, 60)
UIStroke.Thickness = 1
UIStroke.Transparency = 0.5
UIStroke.Parent = MainFrame

-- Layout
local UIListLayout = Instance.new("UIListLayout")
UIListLayout.Padding = UDim.new(0, 12)
UIListLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
UIListLayout.VerticalAlignment = Enum.VerticalAlignment.Top
UIListLayout.Parent = MainFrame

-- Padding
local UIPadding = Instance.new("UIPadding")
UIPadding.PaddingTop = UDim.new(0, 16)
UIPadding.PaddingBottom = UDim.new(0, 16)
UIPadding.PaddingLeft = UDim.new(0, 16)
UIPadding.PaddingRight = UDim.new(0, 16)
UIPadding.Parent = MainFrame

-- Header
local Header = Instance.new("Frame")
Header.Size = UDim2.new(1, 0, 0, 40)
Header.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
Header.Parent = MainFrame

local HeaderCorner = Instance.new("UICorner")
HeaderCorner.CornerRadius = UDim.new(0, 8)
HeaderCorner.Parent = Header

-- Title
local TitleLabel = Instance.new("TextLabel")
TitleLabel.Size = UDim2.new(1, -40, 1, 0)
TitleLabel.Position = UDim2.new(0, 20, 0, 0)
TitleLabel.BackgroundTransparency = 1
TitleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
TitleLabel.Font = Enum.Font.GothamBold
TitleLabel.TextSize = 18
TitleLabel.Text = "Snowy AI"
TitleLabel.TextXAlignment = Enum.TextXAlignment.Left
TitleLabel.Parent = Header

-- Close Button
local CloseButton = Instance.new("TextButton")
CloseButton.Size = UDim2.new(0, 32, 0, 32)
CloseButton.Position = UDim2.new(1, -36, 0, 4)
CloseButton.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
CloseButton.TextColor3 = Color3.fromRGB(255, 255, 255)
CloseButton.Font = Enum.Font.GothamBold
CloseButton.TextSize = 16
CloseButton.Text = "✕"
CloseButton.BorderSizePixel = 0
CloseButton.Parent = Header

local CloseCorner = Instance.new("UICorner")
CloseCorner.CornerRadius = UDim.new(0, 6)
CloseCorner.Parent = CloseButton

CloseButton.MouseButton1Click:Connect(function()
    ScreenGui:Destroy()
end)

-- Improved drag functionality
local dragging = false
local dragInput = nil
local dragStart = nil
local startPos = nil

local function update(input)
    local delta = input.Position - dragStart
    MainFrame.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
end

MainFrame.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
        dragging = true
        dragStart = input.Position
        startPos = MainFrame.Position
        
        input.Changed:Connect(function()
            if input.UserInputState == Enum.UserInputState.End then
                dragging = false
            end
        end)
    end
end)

MainFrame.InputChanged:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
        dragInput = input
    end
end)

UserInputService.InputChanged:Connect(function(input)
    if input == dragInput and dragging then
        update(input)
    end
end)

-- Control section creator
local function createControl(name, property, defaultValue)
    local Section = Instance.new("Frame")
    Section.Size = UDim2.new(1, 0, 0, 80)
    Section.BackgroundColor3 = Color3.fromRGB(35, 35, 35)
    Section.Parent = MainFrame
    
    local SectionCorner = Instance.new("UICorner")
    SectionCorner.CornerRadius = UDim.new(0, 8)
    SectionCorner.Parent = Section
    
    -- Section layout
    local SectionLayout = Instance.new("UIListLayout")
    SectionLayout.Padding = UDim.new(0, 8)
    SectionLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
    SectionLayout.Parent = Section
    
    local SectionPadding = Instance.new("UIPadding")
    SectionPadding.PaddingTop = UDim.new(0, 12)
    SectionPadding.PaddingBottom = UDim.new(0, 12)
    SectionPadding.PaddingLeft = UDim.new(0, 12)
    SectionPadding.PaddingRight = UDim.new(0, 12)
    SectionPadding.Parent = Section
    
    -- Label
    local Label = Instance.new("TextLabel")
    Label.Size = UDim2.new(1, 0, 0, 20)
    Label.BackgroundTransparency = 1
    Label.TextColor3 = Color3.fromRGB(200, 200, 200)
    Label.Font = Enum.Font.Gotham
    Label.TextSize = 14
    Label.Text = name
    Label.TextXAlignment = Enum.TextXAlignment.Left
    Label.Parent = Section
    
    -- Input frame
    local InputFrame = Instance.new("Frame")
    InputFrame.Size = UDim2.new(1, 0, 0, 30)
    InputFrame.BackgroundColor3 = Color3.fromRGB(45, 45, 45)
    InputFrame.Parent = Section
    
    local InputCorner = Instance.new("UICorner")
    InputCorner.CornerRadius = UDim.new(0, 6)
    InputCorner.Parent = InputFrame
    
    -- Text box
    local TextBox = Instance.new("TextBox")
    TextBox.Size = UDim2.new(1, -60, 1, 0)
    TextBox.Position = UDim2.new(0, 8, 0, 0)
    TextBox.BackgroundTransparency = 1
    TextBox.TextColor3 = Color3.fromRGB(255, 255, 255)
    TextBox.PlaceholderColor3 = Color3.fromRGB(120, 120, 120)
    TextBox.Font = Enum.Font.Gotham
    TextBox.TextSize = 14
    TextBox.PlaceholderText = "Enter value"
    TextBox.Text = tostring(defaultValue)
    TextBox.ClearTextOnFocus = false
    TextBox.Parent = InputFrame
    
    -- Apply button
    local ApplyButton = Instance.new("TextButton")
    ApplyButton.Size = UDim2.new(0, 50, 0, 24)
    ApplyButton.Position = UDim2.new(1, -54, 0, 3)
    ApplyButton.BackgroundColor3 = Color3.fromRGB(99, 102, 241)
    ApplyButton.TextColor3 = Color3.fromRGB(255, 255, 255)
    ApplyButton.Font = Enum.Font.GothamBold
    ApplyButton.TextSize = 12
    ApplyButton.Text = "Set"
    ApplyButton.BorderSizePixel = 0
    ApplyButton.Parent = InputFrame
    
    local ButtonCorner = Instance.new("UICorner")
    ButtonCorner.CornerRadius = UDim.new(0, 4)
    ButtonCorner.Parent = ApplyButton
    
    -- Current value display
    local CurrentLabel = Instance.new("TextLabel")
    CurrentLabel.Size = UDim2.new(1, 0, 0, 16)
    CurrentLabel.BackgroundTransparency = 1
    CurrentLabel.TextColor3 = Color3.fromRGB(150, 150, 150)
    CurrentLabel.Font = Enum.Font.Gotham
    CurrentLabel.TextSize = 12
    CurrentLabel.Text = "Current: " .. tostring(defaultValue)
    CurrentLabel.Parent = Section
    
    -- Apply button handler
    ApplyButton.MouseButton1Click:Connect(function()
        local value = tonumber(TextBox.Text)
        if value then
            local _, humanoid = getHumanoid()
            if humanoid then
                pcall(function()
                    humanoid[property] = value
                    CurrentLabel.Text = "Current: " .. tostring(value)
                end)
            end
        end
    end)
    
    -- Update current value periodically
    spawn(function()
        while ScreenGui and ScreenGui.Parent do
            wait(1)
            local _, humanoid = getHumanoid()
            if humanoid then
                local success, currentValue = pcall(function()
                    return humanoid[property]
                end)
                if success then
                    CurrentLabel.Text = "Current: " .. tostring(currentValue)
                end
            end
        end
    end)
end

-- Create controls
local char, hum = getHumanoid()
if hum then
    createControl("Walk Speed", "WalkSpeed", hum.WalkSpeed)
    createControl("Jump Power", "JumpPower", hum.JumpPower)
end

-- Handle character respawn
LocalPlayer.CharacterAdded:Connect(function(newCharacter)
    local newHum = newCharacter:WaitForChild("Humanoid")
    -- Update UI when character respawns
    wait(1) -- Give UI time to update
end)

print("Snowy AI Modifiers Loaded Successfully!")
print("Click the X button to close the UI")
