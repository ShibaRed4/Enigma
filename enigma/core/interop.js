import * as fengari from "fengari-web";
import { getLuaState, toLuaString } from './lua-state.js';

const { lua, interop } = fengari;

// Cache for registered classes
const registeredClasses = new Map();

// Register a JavaScript class to be available in Lua
export function registerClass(luaName, jsClass) {
  const L = getLuaState();
  
  // Push to global table
  lua.lua_pushglobaltable(L);
  
  // Register the class
  interop.push(L, jsClass);
  lua.lua_setfield(L, -2, toLuaString(luaName));
  
  // Store in the cache
  registeredClasses.set(luaName, jsClass);
  
  // Pop global table
  lua.lua_pop(L, 1);
  
  console.log(`Registered class ${luaName} in Lua environment`);
  
  return jsClass;
}

// Get a registered class by name
export function getRegisteredClass(luaName) {
  return registeredClasses.get(luaName);
}

// Push a JavaScript value onto the Lua stack
export function pushValue(value) {
  const L = getLuaState();
  
  if (typeof value === "object" || typeof value === "function") {
    interop.push(L, value);
  } 
  else if (typeof value === "string") {
    lua.lua_pushstring(L, toLuaString(value));
  } 
  else if (typeof value === "number") {
    lua.lua_pushnumber(L, value);
  } 
  else if (typeof value === "boolean") {
    lua.lua_pushboolean(L, value);
  } 
  else if (value === null || value === undefined) {
    lua.lua_pushnil(L);
  } 
  else {
    console.warn(`Pushing nil for unsupported value type: ${typeof value}`);
    lua.lua_pushnil(L);
  }
}

// Convert a Lua value at the given stack index to a JavaScript value
export function toJs(index) {
  const L = getLuaState();
  return interop.tojs(L, index);
}