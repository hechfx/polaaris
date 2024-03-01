const Electron = require("./structure/Electron");
const API = require("./structure/API");

const api = new API(3000);
const electron = new Electron({ 
    width: 1024, 
    height: 720,
    title: "Polaaris",
    frame: false,
    icon: "./src/static/asset/Polaaris.png",
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: `${__dirname}/preload.js`
    }
}, api);

api.listen();
electron.start();

process.on("exit", (code) => {
    api.legacyCloseLegendary()
    console.log(`Exiting POLAARIS... (with code ${code})`);
})