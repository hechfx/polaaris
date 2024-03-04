const { BrowserWindow, app, ipcMain, globalShortcut } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const axios = require("axios")
const path = require("path");
const ini = require("ini")

module.exports = class ElectronInstanceBuilder {
    constructor(options = {}) {
        this.options = options;
        this.win = null;
        this.legendary = path.resolve(process.cwd(), "legendary.exe").replaceAll("/", "\\\\")
    }

    ready() {
        app.whenReady().then(() => this.createWindow())
        app.on("quit", () => {
            if (process.platform === "win32") {
                spawn("taskkill", ["/IM", "legendary.exe", "/F"])
            }
        })
        app.on("will-quit", () => {
            globalShortcut.unregisterAll()
        })
    }

    createWindow() {
        this.win = new BrowserWindow(this.options);
        this.win.loadFile("./src/pages/auth.html");
        globalShortcut.register('CommandOrControl+Shift+I', () => { })
        this.win.setMenu(null)
        this.loadListeners();
    }

    loadListeners() {
        ipcMain.on("change-window", (event, args) => {
            this.win.loadFile(`./src/pages/${args.requestedUrl}.html`)
            event.reply("changed-window", args.requestedUrl)
        })

        ipcMain.on("login-legendary", (event, args) => {

            const child = spawn(this.legendary, ["status", "--json"])

            child.stdout.on("data", (data) => {
                const json = JSON.parse(data.toString().trim());

                if (json.account === "<not logged in>") {
                    this.win.webContents.session.clearCache();
                    this.win.webContents.session.clearStorageData();
                    this.win.webContents.session.clearAuthCache();
                    this.win.loadURL("https://legendary.gl/epiclogin")
                    this.win.webContents.on("did-finish-load", () => {
                        this.win.webContents.executeJavaScript("document.body.innerText")
                            .then((result) => {
                                if (result.startsWith("{")) {
                                    try {
                                        const json = JSON.parse(result);

                                        const child = spawn(this.legendary, ["auth", "--code", json.authorizationCode]);

                                        child.on("exit", () => {
                                            this.win.loadFile("./src/pages/home.html")
                                        })
                                    } catch (err) {
                                        console.error("Failed...")
                                    }
                                }
                            })
                    })
                } else {
                    this.win.loadFile("./src/pages/home.html")
                }
            })
        })

        ipcMain.on("logout-legendary", (event, args) => {
            const child = spawn(this.legendary, ["auth", "--delete"])

            child.on("exit", () => {
                this.win.loadFile("./src/pages/auth.html")
            })
        })

        ipcMain.on("download-legendary", (event, args) => {
            fs.readFile("./legendary.exe", async (err, buffer) => {
                if (err) {
                    const { data } = await axios.get("https://api.github.com/repos/derrod/legendary/releases/latest")
                    const windowsFile = data.assets.filter(asset => asset.content_type === "application/x-msdownload")[0]
                    const file = await axios.get(windowsFile.browser_download_url, { responseType: "stream" })

                    file.data.pipe(fs.createWriteStream("./legendary.exe"))
                    return;
                }
            })
        })

        ipcMain.on("get-legendary-account", (event, args) => {
            const child = spawn(this.legendary, ["status", "--json"])

            child.on('error', (error) => {
                console.error(`spawn error: ${error}`);
            });

            child.stdout.on("data", (data) => {
                event.reply("legendary-account", data.toString())
            })
        })

        ipcMain.on("retrieve-games", (event, args) => {
            const d = {
                allGames: [],
                installedGames: []
            }

            const gamesProcess = spawn(this.legendary, ["list", "--json"])
            const installedGamesProcess = spawn(this.legendary, ["list-installed", "--json"])

            gamesProcess.stdout.on("data", (data) => {
                let games = data.toString().trim()

                d.allGames.push(JSON.parse(JSON.stringify(games)));
            })

            installedGamesProcess.stdout.on("data", (data) => {
                let installedGamesStr = data.toString().trim()

                d.installedGames.push(JSON.parse(JSON.stringify(installedGamesStr)));
            })

            gamesProcess.stdout.on("end", () => {
                event.reply("legendary-games", d)
            })
        })

        ipcMain.on("install-game", (event, args) => {
            const child = spawn(this.legendary, ["install", args.game, "-y"]);

            let progress = 0;
            let game = "";
            let downloading = false;
            let ETA = "";
            let downloadSpd = 0;

            child.stderr.on("data", (data) => {
                const information = data.toString().trim();

                const getProgress = information.match(/Progress: (\d+\.\d+)%/);
                const getETA = information.match(/ETA: (\d{2}:\d{2}:\d{2})/);
                const getDownloadsSpeed = information.match(/\+ Download\t- (\d+\.\d+) MiB\/s \(raw\)/);

                if (getProgress) {
                    progress = parseFloat(getProgress[1]);
                    game = args.game
                    downloading = true;
                }

                if (getETA) {
                    ETA = getETA[1]
                }

                if (getDownloadsSpeed !== null) {
                    downloadSpd = parseFloat(getDownloadsSpeed[1])
                }

                const d = {
                    progress,
                    game,
                    downloading,
                    ETA,
                    downloadSpd
                }

                event.reply("download-status", d)
            })

            child.on("exit", () => {
                progress = 0;
                game = "game";
                downloading = false;
                event.sender.reload()
            })
        })

        ipcMain.on("play-game", (event, args) => {
            const child = spawn(this.legendary, ["launch", args.game])

            child.on("exit", () => {
                console.log("Game is running")
                event.sender.reload();
            })
        })

        ipcMain.on("uninstall-game", (event, args) => {
            const child = spawn(this.legendary, ["uninstall", args.game, "-y"])

            child.on("exit", () => {
                console.log("Game uninstalled")
                event.sender.reload()
            })
        })

        ipcMain.on("cancel-download", (event, args) => {
            spawn("taskkill", ["/IM", "legendary.exe", "/F"])
            this.win.webContents.reload()
        })

        ipcMain.on("send-settings", (event, args) => {
            const child = spawn(this.legendary, ["status", "--json"])

            child.stdout.on("data", (data) => {
                const json = JSON.parse(data);
                const filePath = path.join(json.config_directory, "/config.ini");
                const fileJson = ini.parse(fs.readFileSync(filePath).toString());

                event.reply("legendary-settings", {
                    installationPath: fileJson["Legendary"]["installation_path"],
                    disableUpdateCheck: fileJson["Legendary"]["disable_update_check"],
                    disableUpdateNotice: fileJson["Legendary"]["disable_update_notice"]
                })
            })
        })

        ipcMain.on("save-settings", (event, args) => {
            const child = spawn(this.legendary, ["status", "--json"])

            child.stdout.on("data", (data) => {
                const json = JSON.parse(data);
                const filePath = path.join(json.config_directory, "/config.ini");
                const fileJson = ini.parse(fs.readFileSync(filePath).toString());

                fileJson["Legendary"]["installation_path"] = args.installationPath;
                fileJson["Legendary"]["disable_update_check"] = args.disableUpdateCheck;
                fileJson["Legendary"]["disable_update_notice"] = args.disableUpdateNotice;

                fs.writeFileSync(filePath, ini.stringify(fileJson))
                console.log("Saved new configs")
                event.reply("legendary-settings", {
                    installationPath: args.installationPath,
                    disableUpdateCheck: args.disableUpdateCheck,
                    disableUpdateNotice: args.disableUpdateNotice
                })
                this.win.webContents.reload()
            })
        })

        ipcMain.on("migrate-games", (event, args) => {
            const child = execFile(this.legendary, ["egl-sync", "--import-only", "-y"])

            child.stdout.on("data", (data) => {
                console.log(data)
            })

            child.on("exit", () => {
                console.log("Migration enabled.")
            })
        })
    }
}