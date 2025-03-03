<div align="center">

# 👑 **Enigma**

### ✨ *A simple, lightweight, and powerful JS library for adding Roblox-Like scripting into the web!*
### 🔔 *This was made for another project called [Marina](https://github.com/ShibaRed4/Marina)! Check it out!*
</div>

---

## 🚀 **Features**

- 📜 **Requiring other Lua scripts from the main script**  
  Easily load and execute Lua scripts dynamically, just like requiring modules in Roblox.

- 🖱️ **Lua scripts can manipulate DOM elements through JS classes**  
  Bridge the gap between Lua and the web by allowing Lua scripts to interact with HTML elements.

- 🧑‍💻 **JS classes are able to be used in the Lua environment**  
  Seamlessly pass JavaScript classes into Lua, enabling powerful two-way communication.

---

## 🛠️ **How It Works**

1. **Register JavaScript Classes**  
   Use `enigma.registerClass()` to expose your JavaScript classes to Lua.

2. **Load Lua Scripts**  
   Load Lua scripts dynamically using `enigma.loadScript()`.

3. **Call Lua Functions**  
   Call Lua functions from JavaScript using `luaModule.callFunction()`.

4. **Interact with the DOM**  
   Manipulate HTML elements directly from Lua scripts by bridging JavaScript classes.

---

## 🏷️ **Example Usage**

# JS

```javascript
// test.js
import Enigma from "./Enigma/index.js";

const enigma = Enigma.init();

class DOMEditor {
  setText(query, text) {
    document.querySelector(query).innerHTML = newText;
  }
}

const luaModule = await enigma.loadScript("main.lua");
const newDOMClass = new DOMEditor()
await luaModule.callFunction("init", newDOMClass); 
```

# Lua

```lua
--enigma/scripts/test.lua
local module = {}

module.init = function(domEditor)
    domEditor:setText("test", "This element was edited via Lua!") -- This should now change the element "test" text.
end

return module
```

## 🌟 **Get Started!**

###  To get started, simply clone the repo, and drag and drop the "enigma" folder into your project and enjoy!

#

<div align="center">
❤️ Credits

This library is powered by the amazing Fengari project.
Fengari brings Lua to the web, and Enigma builds on it to create a seamless scripting experience.

</div>