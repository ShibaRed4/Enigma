import Enigma from "./Enigma/index.js";
const enigma = Enigma.init();

class bar{
    constructor(){
        this.testData = [];
    }
}

class foo{
    constructor(){
        this.bar = new bar()
    }
    changeData(index, value){
        this.bar.testData[index] = value
    }
}

enigma.registerClass('foo', foo);

const luaModule = await enigma.loadScript('test.lua')
const result = await luaModule.callFunction('Guess')
console.log(result)