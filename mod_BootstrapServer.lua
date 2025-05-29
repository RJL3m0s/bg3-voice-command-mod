-- File: mod/BootstrapServer.lua

local host = "127.0.0.1"
local port = 12345
local server_socket = nil
local client_socket = nil

local function start_server()
    print("[BG3 Mod] Attempting to start TCP server...")
    local socket = require("socket")
    server_socket = socket.tcp()
    server_socket:settimeout(0.1)
    local success, err = server_socket:bind(host, port)
    if not success then
        print(string.format("[BG3 Mod] Error binding socket: %s", err))
        server_socket:close()
        server_socket = nil
        return false
    end
    success, err = server_socket:listen(1)
    if not success then
        print(string.format("[BG3 Mod] Error listening on socket: %s", err))
        server_socket:close()
        server_socket = nil
        return false
    end
    print(string.format("[BG3 Mod] Listening for connections on %s:%s", host, port))
    return true
end

local function accept_client()
    if not server_socket then return end
    local client, err = server_socket:accept()
    if client then
        client_socket = client
        client_socket:settimeout(0.1)
        print("[BG3 Mod] Client connected from " .. client_socket:getpeername())
        return true
    elseif err ~= "timeout" then
        print(string.format("[BG3 Mod] Error accepting client: %s", err))
        server_socket:close()
        server_socket = nil
    end
    return false
end

local function execute_game_command(command_text)
    local command_lower = string.lower(command_text:strip())
    local player_char_uuid = Ext.GetPlayer().MyGuid

    print(string.format("[BG3 Mod] Attempting to execute: '%s' for player '%s'", command_text, player_char_uuid))

    if command_lower == "jump" then
        if player_char_uuid then
            Ext.RPC.Call("DoAction", player_char_uuid, "Jump", "Jump")
            print("[BG3 Mod] Executed: Jump action.")
        else
            print("[BG3 Mod] Could not find player character to jump.")
        end
    elseif command_lower == "heal me" then
        if player_char_uuid then
            print("[BG3 Mod] Executed: Hypothetically healed player.")
        else
            print("[BG3 Mod] Could not find player character to heal.")
        end
    elseif command_lower:find("spawn item") then
        local item_name = command_lower:gsub("spawn item ", ""):strip()
        local item_uuid = "e6c0c279-9941-477d-8153-294711f71f65"
        if item_name == "potion" or item_name == "healing potion" then
            if player_char_uuid then
                local x, y, z = Ext.GetPosition(player_char_uuid)
                if x then
                    Osi.SpawnItem(item_uuid, x, y + 1, z, Ext.GetMap(player_char_uuid), 1)
                    print(string.format("[BG3 Mod] Spawned 1 Healing Potion near player."))
                else
                    print("[BG3 Mod] Could not get player position to spawn item.")
                end
            end
        else
            print(string.format("[BG3 Mod] Don't know how to spawn: %s", item_name))
        end
    elseif command_lower == "open map" then
        Ext.RPC.Call("SetUIHidden", false)
        Ext.RPC.Call("OpenMap")
        print("[BG3 Mod] Executed: Open Map (if supported).")
    else
        print(string.format("[BG3 Mod] Unknown command: '%s'", command_text))
    end
end

local function process_messages()
    if not client_socket then return end
    local data, err = client_socket:receive("*l")
    if data then
        print("[BG3 Mod] Received raw command: " .. data)
        execute_game_command(data)
    elseif err == "closed" then
        print("[BG3 Mod] Client disconnected.")
        client_socket:close()
        client_socket = nil
    elseif err ~= "timeout" then
        print(string.format("[BG3 Mod] Error receiving data: %s", err))
        client_socket:close()
        client_socket = nil
    end
end

Ext.Osiris.RegisterListener("Delta", "OnGameUpdate", function()
    if not server_socket then
        start_server()
    elseif not client_socket then
        accept_client()
    else
        process_messages()
    end
end)

print("[BG3 Mod] Voice Command Mod loaded. Waiting for Script Extender 'OnGameUpdate' hook. (V2)")