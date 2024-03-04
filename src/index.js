const ElectronInstanceBuilder = require("./structure/ElectronInstanceBuilder.js");
const path = require("path")
const instance = new ElectronInstanceBuilder({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    title: "POLAARIS",
    icon: path.join(__dirname, "/pages/static/asset/Polaaris.png"),
    webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "/structure/preload.js")
    }
})

instance.ready();