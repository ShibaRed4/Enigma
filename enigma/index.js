// Main entry point for the Enigma framework
import { initLuaState } from './core/lua-state.js';
import { registerClass } from './core/interop.js';
import { loadLuaScript } from './core/module-loader.js';

// Export the main API
export default {
  // Initialize the framework
  init() {
    // Initialize Lua state with all standard libraries
    const L = initLuaState();
    
    // Register built-in classes
    registerClass('MyJSClass', MyJavaScriptClass);
    
    return this;
  },
  
  // Register a custom class to be available in Lua
  registerClass(luaName, jsClass) {
    registerClass(luaName, jsClass);
    return this;
  },
  
  // Load and execute a Lua script
  async loadScript(scriptPath) {
    return await loadLuaScript(scriptPath);
  }
};