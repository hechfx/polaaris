const { app, BrowserWindow, BrowserView, ipcMain, shell } = require("electron");

module.exports = class Electron {
    constructor(options = {}, api) {
        this.options = options;
        this.win = null;
        this.view = null;
        this.api = api;
        this.clientId = "1212469859909111818"
    }

    start() {
        app.disableHardwareAcceleration()
        app.on("ready", this.createWindow.bind(this));
    }

    createWindow() {
        this.win = new BrowserWindow(this.options);
        this.view = new BrowserView({
            width: this.options.width,
            height: this.options.height,
            webPreferences: {
                ...this.options.webPreferences
            }
        });

        this.win.loadFile("./src/index.html");
        this.win.setBrowserView(this.view);
        this.view.setBounds({ x: 0, y: 30, width: this.options.width, height: this.options.height - 30 });
        this.view.webContents.loadURL(`http://localhost:${this.api.port}`);
        this.view.webContents.session.clearCache();
        this.registerEvents();

        
    }

    registerEvents() {
        ipcMain.on("open-path", async (event, path) => {
            const result = await shell.showItemInFolder(path);
            event.reply("open-path-result", result);
        });

        ipcMain.on("back-to-polaaris", () => {
            this.view.webContents.loadURL(`http://localhost:${this.api.port}`);
        })

        ipcMain.on("minimize", () => this.win.minimize());

        ipcMain.on("maximize", () => {
            if (this.win.isMaximized()) {
                this.win.unmaximize();
            } else {
                this.win.maximize();
            }
        });

        ipcMain.on("close", () => {
            this.win.close();
            this.api.legacyCloseLegendary();
        });

        this.win.on("resize", () => {
            let { width, height } = this.win.getBounds();
            this.view.setBounds({ x: 0, y: 30, width, height: height - 30 });
        });
    }
};