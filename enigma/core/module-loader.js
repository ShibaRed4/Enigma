import * as fengari from "fengari-web";
import { getLuaState, toLuaString, toJsString } from './lua-state.js';
import { pushValue, toJs } from './interop.js';

const { lua, lauxlib } = fengari;

// Store loaded modules to prevent reloading
const loadedModules = new Map();

// Async function to fetch a Lua file
export async function fetchLuaFile(path) {
  try {
    // Check if we've already loaded this module
    if (loadedModules.has(path) && typeof loadedModules.get(path) === 'string') {
      console.log(`Module ${path} found in cache`);
      return loadedModules.get(path);
    }
    
    console.log(`Fetching Lua module: ${path}`);
    const response = await fetch(path);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch module: ${response.statusText}`);
    }
    
    const luaCode = await response.text();
    console.log(`Fetched Lua module ${path}, ${luaCode.length} bytes`);
    
    // Store in cache
    loadedModules.set(path, luaCode);
    return luaCode;
  } catch (error) {
    console.error(`Error fetching Lua module ${path}:`, error);
    throw error;
  }
}

// Require function to be exposed to Lua
export function jsRequire(modulePath) {
  console.log(`jsRequire called with path: ${modulePath}`);
  
  // If the module path doesn't end with .lua, add it
  if (!modulePath.endsWith('.lua')) {
    modulePath += '.lua';
  }
  
  // Always use the scripts directory for our custom modules
  // unless the path is already absolute or remote
  if (!modulePath.startsWith('./') && !modulePath.startsWith('/') && !modulePath.startsWith('http')) {
    // Use enigma/scripts directory for modules
    modulePath = `./enigma/scripts/${modulePath}`;
  }
  
  console.log(`Resolved module path: ${modulePath}`);
  
  // Check if already loaded from cache
  if (loadedModules.has(modulePath) && 
      typeof loadedModules.get(modulePath) === 'object' && 
      loadedModules.get(modulePath).loaded) {
    console.log(`Module ${modulePath} already loaded, returning from cache`);
    return loadedModules.get(modulePath).exports;
  }
  
  // Return a promise that will be converted to Lua code
  return fetchLuaFile(modulePath)
    .then(luaCode => {
      const L = getLuaState();
      
      // Wrap the module code in a function to create proper scope
      const wrappedCode = `
        local module = {}
        local exports = {}
        module.exports = exports
        
        -- Define local require function for this module
        local function require(path)
          return js.global.jsRequire(path)
        end
        
        -- Run the module code with module and exports in scope
        do
          ${luaCode}
        end
        
        -- Return the exports
        return module.exports
      `;
      
      // Load and execute the wrapped code
      const loadResult = lauxlib.luaL_loadbuffer(
        L, 
        toLuaString(wrappedCode), 
        toLuaString(`@${modulePath}`)
      );
      
      if (loadResult !== lua.LUA_OK) {
        const errorMsg = toJsString(lua.lua_tostring(L, -1));
        console.error(`Error loading module ${modulePath}:`, errorMsg);
        lua.lua_pop(L, 1);
        throw new Error(`Error loading module ${modulePath}: ${errorMsg}`);
      }
      
      // Execute the module function
      const execResult = lua.lua_pcall(L, 0, 1, 0);
      
      if (execResult !== lua.LUA_OK) {
        const errorMsg = toJsString(lua.lua_tostring(L, -1));
        console.error(`Error executing module ${modulePath}:`, errorMsg);
        lua.lua_pop(L, 1);
        throw new Error(`Error executing module ${modulePath}: ${errorMsg}`);
      }
      
      // Get the module.exports table
      const exports = toJs(-1);
      lua.lua_pop(L, 1);
      
      // Update cache with the loaded status and exports
      loadedModules.set(modulePath, { 
        loaded: true, 
        exports: exports 
      });
      
      console.log(`Module ${modulePath} loaded successfully`);
      return exports;
    })
    .catch(error => {
      console.error(`Error in require for ${modulePath}:`, error);
      throw error;
    });
}

// Setup the Lua environment with our custom require function
export function setupRequireFunction() {
  const L = getLuaState();
  
  // Push global table
  lua.lua_pushglobaltable(L);
  
  // Register the JS require function
  pushValue(jsRequire);
  lua.lua_setfield(L, -2, toLuaString("jsRequire"));
  
  // Pop global table
  lua.lua_pop(L, 1);
  
  // Set up the custom require function in Lua
  lauxlib.luaL_dostring(
    L,
    toLuaString(`
    -- Only set up custom require if js.global is available
    if _G.js ~= nil and _G.js.global ~= nil then
      local originalRequire = require
      _G.require = function(path)
        print("Custom require function called with path: " .. path)
        
        -- Try standard require first
        local ok, result = pcall(originalRequire, path)
        
        if ok then
          return result
        else
          print("Standard require failed: " .. tostring(result))
          print("Trying jsRequire instead")
          
          -- Try jsRequire as fallback
          return js.global.jsRequire(path)
        end
      end
    end
    `)
  );
  
  console.log("Custom require function set up in Lua environment");
}

// Load and execute Lua script
export async function loadLuaScript(filePath) {
  try {
    const L = getLuaState();
    
    // Ensure the require function is set up
    setupRequireFunction();
    
    // Resolve the path to be within the enigma/scripts directory if it's not absolute
    let resolvedPath = filePath;
    if (!filePath.startsWith('./') && !filePath.startsWith('/') && !filePath.startsWith('http')) {
      resolvedPath = `./enigma/scripts/${filePath}`;
    }
    
    const luaCode = await fetchLuaFile(resolvedPath);
    
    // Load and execute the Lua code
    const result = lauxlib.luaL_dostring(L, toLuaString(luaCode));
    
    if (result !== lua.LUA_OK) {
      const errorMsg = toJsString(lua.lua_tostring(L, -1));
      throw new Error(`Lua execution error: ${errorMsg}`);
    }
    
    // Store the module table in Lua registry to keep it accessible
    const moduleRef = lauxlib.luaL_ref(L, lua.LUA_REGISTRYINDEX);
    
    return {
      callFunction: function(funcName, ...args) {
        return callLuaFunction(moduleRef, funcName, ...args);
      },
      
      releaseModule: function() {
        // Release the reference to the module table
        lauxlib.luaL_unref(L, lua.LUA_REGISTRYINDEX, moduleRef);
      }
    };
  } catch (error) {
    console.error("Error in loadLuaScript:", error);
    return null;
  }
}

// Helper function to call a Lua function by name from a referenced table
function callLuaFunction(moduleRef, funcName, ...args) {
  const L = getLuaState();
  
  // Push the module table onto the stack
  lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, moduleRef);
  
  // Get the function from the table
  lua.lua_getfield(L, -1, toLuaString(funcName));
  
  if (!lua.lua_isfunction(L, -1)) {
    console.warn(`"${funcName}" is not a function in the Lua table`);
    lua.lua_pop(L, 2); // Pop non-function value and table
    return null;
  }
  
  // Push the table as 'self' parameter (for methods)
  lua.lua_pushvalue(L, -2);
  
  // Push additional arguments
  args.forEach(arg => pushValue(arg));
  
  // Call the function with args.length + 1 arguments (the +1 is for 'self')
  const numReturns = 1;
  const callResult = lua.lua_pcall(L, args.length + 1, numReturns, 0);
  
  if (callResult !== lua.LUA_OK) {
    const errorMsg = toJsString(lua.lua_tostring(L, -1));
    console.error(`Error calling "${funcName}":`, errorMsg);
    lua.lua_pop(L, 2); // Pop error message and table
    return null;
  }
  
  // Get the return value
  let returnValue = toJs(-1);
  
  // Pop the return value and the table
  lua.lua_pop(L, 2);
  
  return returnValue;
}