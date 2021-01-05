print("GameMode addon_init letsago")
function PrintTable(t, indent, done)
    --print ( string.format ('PrintTable type %s', type(keys)) )
    if type(t) ~= "table" then return end
  
    done = done or {}
    done[t] = true
    indent = indent or 0
  
    local l = {}
    for k, v in pairs(t) do
      table.insert(l, k)
    end
  
    table.sort(l)
    for k, v in ipairs(l) do
      -- Ignore FDesc
      if v ~= 'FDesc' then
        local value = t[v]
  
        if type(value) == "table" and not done[value] then
          done [value] = true
          print(string.rep ("\t", indent)..tostring(v)..":")
          PrintTable (value, indent + 2, done)
        elseif type(value) == "userdata" and not done[value] then
          done [value] = true
          print(string.rep ("\t", indent)..tostring(v)..": "..tostring(value))
          PrintTable ((getmetatable(value) and getmetatable(value).__index) or getmetatable(value), indent + 2, done)
        else
          if t.FDesc and t.FDesc[v] then
            print(string.rep ("\t", indent)..tostring(t.FDesc[v]))
          else
            print(string.rep ("\t", indent)..tostring(v)..": "..tostring(value))
          end
        end
      end
    end
  end

local function typeMap(type)
    local newType = string.lower(type)
    if newType == "string" then
        newType = "cstring"
    end
    if newType == "unsigned" then
        newType = "uint"
    end
    return newType
end
local function buildFunctionSignature(name, desc)
    local args = {}
    local arg_names = {}
    for i = 0, #desc - 1 do
      --table.insert(args, { name = desc[i][2] ~= "" and desc[i][2] or nil, type = desc[i][1] })
      table.insert(args, typeMap(desc[i][1]))
      table.insert(arg_names, desc[i][2] ~= "" and desc[i][2] or nil)
    end
  
    return {
      description = desc.desc ~= "" and desc.desc or nil,
      args = args,
      arg_names = #arg_names > 0 and arg_names or nil,
      ["return"] = typeMap(desc.returnType),
    }
  end
  
local function findGlobal(value)
    for k, v in pairs(_G) do
        if v == value then
        return k
        end
    end
end

local function findInstance(value)
    for k, v in pairs(_G) do
        if getmetatable(v) and #k > 1 and not CDesc[k] and getmetatable(v).__index == value then
        return k
        end
    end
end

local function dumpScriptBindings()
    local bindings = {
        ["Global"] = {
            ["functions"] = {}
        }
    }

    for name, fdesc in pairs(FDesc) do
        bindings["Global"]["functions"][name] = buildFunctionSignature(name, fdesc)
    end

    for className, cdesc in pairs(CDesc) do
        local functions = {}
        for name, fdesc in pairs(cdesc.FDesc) do
            functions[name] = buildFunctionSignature(name, fdesc)
        end

        local meta = getmetatable(cdesc)
        local binding = {
            functions = functions,
            extends = meta.__index and findGlobal(meta.__index) or nil
        }
        setmetatable(binding.functions, {
            __jsontype = "object"
        })

        if _G[className] ~= cdesc then
            binding.instance = className
        else
            binding.instance = findInstance(cdesc)
        end

        bindings[className] = binding
    end

    
    local enums = {
        ["_Unscoped"] = {}
    }
    for key, value in pairs(_G) do
        if not CDesc[key] and not FDesc[key] then
            if type(value) == "number" then
                local enum, desc = (function()
                    for enumName, edesc in pairs(EDesc) do
                        for valueName, vdesc in pairs(edesc) do
                            if key == valueName then
                                return enumName, vdesc ~= "" and vdesc or nil
                            end
                        end
                    end
                end)()
                if enum == nil then
                    enum = "_Unscoped"
                end
                if enums[enum] == nil then
                    enums[enum] = {}
                end
                table.insert(enums[enum], {
                    key = key,
                    value = value,
                    description = desc,
                })
            else
                -- Rest are:
                -- - Instances of classes (handled in class definition)
                -- - Standard Lua globals
                -- - Engine globals, that are wrapped in core scripts anyway
                -- - Global functions from core scripts, that aren't useful because they are mostly automatically converted from Squirrel and aren't used in dota
            end
        end
    end
    for key, value in pairs(enums) do
        table.sort(value, function(a, b)
            if a.value == b.value then
                return a.key < b.key
            else
                return a.value < b.value
            end
        end)
    end

    table.sort(bindings, function(a, b)
        if a.kind < b.kind then
            return false
        elseif a.kind > b.kind then
            return true
        else
            return a.name < b.name
        end
    end)

    return bindings, enums
end

filesPending = {}

local function writeToDisk(filename, data)
    filesPending[filename] = true
    local req = CreateHTTPRequestScriptVM('POST', "http://localhost:8888/disk/" .. filename);
    local options = {
        ["indent"] = true
    }
    req:SetHTTPRequestRawPostBody('application/json', json.encode(data, options))
    req:Send(function (res)
        PrintTable(res)
        print(filename .. " | " .. res.StatusCode)
        PrintTable(res.Body)
        filesPending[filename] = false
        checkIfFinished()
    end)
    print("Wrote to disk for: " .. filename)
end

function checkIfFinished()
    print("checking if finished")
    PrintTable(filesPending)
    local i = 0
    for k, v in pairs(filesPending) do
        i = i + 1
        if v == true then
            print(k .. " hasn't finished, aborting")
            return
        end
    end
    if i ~= 2 then
        print("We don't have 2 requests? | " .. i)
        return
    end
    print("We are finished")
    if IsServer() then
        print("[Server] Done!");        
        SendToServerConsole("cl_script_reload");
    else
        print("[Client] Done!");
        SendToConsole("quit");
    end
end

local function getTime()
    local timeTable = LocalTime()
    local time = timeTable.Hours * 60 * 60
    time = time + (timeTable.Minutes * 60)
    time = time + timeTable.Seconds
    return time
end

if IsServer() == false then
    print(Time())
    PrintTable(LocalTime())
end
if Convars:GetBool("moddota_dump_init") then
    print("We are inside the convar", IsServer())
    -- These calls define globals
    CreateHTTPRequest("GET", "")
	CreateUniformRandomStream(0)
    if IsServer() then CreateDamageInfo(nil, nil, Vector(), Vector(), 0, 0) end


    if IsServer() then
        filename = "lua_server.json"
        filename_enums = "lua_server_enums.json"
    else
        filename = "lua_client.json"
        filename_enums = "lua_client_enums.json"
    end

    local bindings, enums = dumpScriptBindings()
    writeToDisk(filename, bindings)
    writeToDisk(filename_enums, enums)
else
    if IsServer() ~= true then
        Convars:RegisterConvar("moddota_dump_init", "", "Have we done a lap yet", FCVAR_PROTECTED);
        Convars:SetBool("moddota_dump_init", true);
        print("Requesting Delay")
        local req = CreateHTTPRequestScriptVM('GET', "http://localhost:8888/delay");
        req:Send(function(res)
            PrintTable(res)
            print(res.StatusCode)
            PrintTable(res.Body)
            SendToConsole("echoln [ModDota] Start CSS Properties")
            SendToConsole("dump_panorama_css_properties")
            SendToConsole("echoln [ModDota] End CSS Properties")
            SendToConsole("echoln [ModDota] Start Events")
            SendToConsole("dump_panorama_events")
            SendToConsole("echoln [ModDota] End Events")
            SendToConsole("echoln [ModDota] Start Modifiers")
            SendToConsole("dump_modifier_list")
            SendToConsole("echoln [ModDota] End Modifiers")
            SendToConsole("script_reload")
        end)
    end
end
