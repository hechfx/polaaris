const { execFile, spawn, exec } = require('node:child_process');
const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const ini = require("ini");
const find = require('find-process');
const kill = require('tree-kill');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require("cors");
const RPC = require('discord-rpc');
const axios = require("axios")

const LEGENDARY = {
    SELF: "legendary",
    AUTH: "auth",
    JSON_OPTION: "--json",
    LIST_INSTALLED: "list-installed",
    EGL_SYNC: "egl-sync",
    LIST: "list",
    INSTALL: "install",
    LAUNCH: "launch",
    UNINSTALL: "uninstall",
    STATUS: "status",
    DELETE_OPTION: "--delete",
    YES_OPTION: "-y",
    EOS_OVERLAY: "eos-overlay",
    ENABLE: "enable",
    IMPORT: "--import-only",
    DISABLE_SYNC: "--disable-sync"
};

let child;
let progress = 0;
let game = "game";
let downloading = false;
let ETA = "00:00:00";
let downloadSpd = 0;
let currentUser = "placeholder"

module.exports = class API {
    constructor(port) {
        this.port = port;
        this.app = express();
        this.configString = fs.readFileSync("./config.ini").toString()
        this.config = ini.parse(this.configString)

        this.app.use(cors())
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use("/pt-BR", createProxyMiddleware("/pt-BR", {
            target: "http://store.epicgames.com",
            changeOrigin: true,
            secure: false
        }));
        this.app.use("/static", express.static(path.join(__dirname, "../static")));

        this.app.set("view engine", "ejs");
        this.app.set("views", path.join(__dirname, "../view"));

        this.app.post("/api/legendary/migrate", this.migrateGames.bind(this));
        this.app.post("/api/legendary/config", this.saveConfig.bind(this));
        this.app.post("/logout", this.logout.bind(this));
        this.app.post("/api/epic/auth", this.authenticate.bind(this));
        this.app.post("/api/epic/:method/:game", this.handleGameRequest.bind(this));
        this.app.post("/api/epic/cancel", this.closeLegendary.bind(this));
        this.app.post("/api/account/games/installed", this.getInstalledGames.bind(this));
        this.app.post("/api/account/games", this.getAllGames.bind(this));
        this.app.post("/api/account", this.getAccount.bind(this));
        this.client = new RPC.Client({ transport: "ipc" });
        this.clientId = "1212469859909111818"
    }

    listenRpc() {
        this.app.use((req, res, next) => {
            let currentlyOn = req.originalUrl
            let name = "Inativo";
            let status = "Inativo";

            switch (currentlyOn) {
                case "/":
                    name = "Home";
                    break;
                case "/account":
                    name = "Informações da Conta";
                    break;
                case "/account/games":
                    name = "Biblioteca";
                    break;
                case "/account/settings":
                    name = "Configurações";
                    break;
            }

            if (game === "game") {
                status = "Inativo"
            } else {
                name = `${game.toUpperCase()}`
                status = `${progress}% - ${ETA}`
            }

            this.client.request("SET_ACTIVITY", {
                pid: process.pid,
                activity: {
                    details: name,
                    state: status,
                    assets: {
                        large_image: "polaaris",
                        large_text: "Polaaris",
                    }
                }
            })
            
            if (this.config.polaaris.discord_rpc) {
                this.client.login({ clientId: this.clientId }).catch(console.error);
                next()
            } else {
                next()
            }
        })
    }

    listen() {
        this.listenRpc()

        this.load();

        this.app.listen(this.port, () => {
            let install = spawn(LEGENDARY.SELF, [LEGENDARY.EOS_OVERLAY, LEGENDARY.INSTALL]);

            install.stdout.on("data", (data) => {
                console.log(data.toString());
            });

            install.stderr.on("data", (data) => {
                console.log(data.toString());
            });

            install.on("exit", () => {
                console.log("EOS Overlay installed");

                let enable = spawn(LEGENDARY.SELF, [LEGENDARY.EOS_OVERLAY, LEGENDARY.ENABLE]);

                enable.stdout.on("data", (data) => {
                    console.log(data.toString());
                });

                enable.stderr.on("data", (data) => {
                    console.log(data.toString());
                });

                enable.on("exit", () => {
                    console.log("EOS Overlay enabled");
                });
            });

            console.log(`API listening on port ${this.port}`);
        });
    }

    migrateGames(req, res) {
        const child = execFile(LEGENDARY.SELF, [LEGENDARY.EGL_SYNC, LEGENDARY.IMPORT, LEGENDARY.YES_OPTION])

        child.stdout.on("data", (data) => {
            console.log(data)
        })

        child.on("exit", () => {
            const child2 = execFile(LEGENDARY.SELF, [LEGENDARY.EGL_SYNC, LEGENDARY.DISABLE_SYNC])

            child2.stdout.on("data", (data) => {
                console.log(data)
            })

            child2.on("exit", () => {
                res.json({ status: 200 })
            })
        })
    }

    legacyCloseLegendary() {
        const processName = "legendary"

        find('name', processName).then((list) => {
            if (!list.length) {
                console.log("No legendary process found")
            }

            for (let proc of list) {
                console.log(`Killing process ${proc.pid}`);
                kill(proc.pid);
            }
        }, (err) => {
            console.log(err.stack || err);
        })
    }

    closeLegendary(req, res) {
        const processName = "legendary"

        find('name', processName).then((list) => {
            if (!list.length) {
                console.log("No legendary process found")
                res.json({ status: 404 })
                return
            }

            for (let proc of list) {
                kill(proc.pid);
            }
            res.json({ status: 200 })
        }, (err) => {
            console.log(err.stack || err);
            res.json({ status: 404 })
        })
    }

    saveConfig(req, res) {
        const { disableUpdateCheck, disableUpdateNotice, installationPath } = req.body;
        const child = execFile(LEGENDARY.SELF, [LEGENDARY.STATUS, LEGENDARY.JSON_OPTION])

        child.stdout.on("data", (data) => {
            const json = JSON.parse(data)
            const filePath = path.join(json.config_directory, "/config.ini")
            let newConfig = ""
            newConfig += "[Legendary]\n"
            newConfig += "; Disables the automatic update check\n"
            newConfig += `disable_update_check = ${disableUpdateCheck}\n`
            newConfig += "; Disables the update notice\n"
            newConfig += `disable_update_notice = ${disableUpdateNotice}\n`
            newConfig += "; Directory where games are installed\n"
            newConfig += `install_dir = ${installationPath}`

            fs.writeFileSync(filePath, "")
            fs.writeFileSync(filePath, newConfig)
            res.json({ status: 200 })
        })
    }

    logout(req, res) {
        execFile(LEGENDARY.SELF, [LEGENDARY.AUTH, LEGENDARY.DELETE_OPTION], (error, stdout, stderr) => {
            if (error) {
                res.send(error);
                return;
            }

            res.json({ status: 200 })
        })
    }

    handleGameRequest(req, res) {
        const method = req.params.method;

        switch (method) {
            case LEGENDARY.INSTALL:
                this.installGame(req, res);
                break;
            case LEGENDARY.LAUNCH:
                this.launchGame(req, res);
                break;
            case LEGENDARY.UNINSTALL:
                this.uninstallGame(req, res);
                break;
        }
    }

    getAccountInfo(req, res) {
        execFile(LEGENDARY.SELF, [LEGENDARY.STATUS, LEGENDARY.JSON_OPTION], (error, stdout, stderr) => {
            if (error) {
                res.send(error);
                return;
            }

            return JSON.parse(stdout)
        })
    }

    uninstallGame(req, res) {
        execFile(LEGENDARY.SELF, [LEGENDARY.UNINSTALL, req.params.game, LEGENDARY.YES_OPTION], (error, stdout, stderr) => {
            if (error) {
                res.send(error);
                return;
            }

            res.json({ status: 200 })
        })
    }

    installGame(req, res) {
        child = spawn(LEGENDARY.SELF, [LEGENDARY.INSTALL, req.params.game, LEGENDARY.YES_OPTION])

        if (downloading === false) {
            child.stderr.on("data", (data) => {
                let information = data.toString()

                const getProgress = information.match(/Progress: (\d+\.\d+)%/);
                const getETA = information.match(/ETA: (\d{2}:\d{2}:\d{2})/);
                const getDownloadInfo = information.match(/(\d+\.\d+)/g);

                if (getProgress) {
                    progress = parseFloat(getProgress[1]);
                    game = req.params.game;
                    downloading = true;

                    if (getETA) {
                        ETA = getETA[1]
                    }
                }
            })

            child.on("exit", () => {
                progress = 0;
                game = "game";
                downloading = false;
                res.json({ status: 200 })
            })
        } else {
            res.json({ status: 409 })
        }
    }

    launchGame(req, res) {
        switch (req.params.game) {
            case "grand theft auto v" || "red dead redemption" || "red dead redemption 2":
                exec("start /B \"null\" \"C:\\Program Files\\Rockstar Games\\Launcher\\LauncherPatcher.exe\"")
                let delay = exec("ping -n 15 localhost > nul")

                delay.on("exit", () => {
                    let launch = execFile(LEGENDARY.SELF, [LEGENDARY.LAUNCH, req.params.game])

                    launch.stderr.on("data", (data) => {
                        console.log(data)
                    })

                    launch.on("exit", () => {
                        res.json({ status: 200 })
                    })
                })
                break;
        }


        let launch = execFile(LEGENDARY.SELF, [LEGENDARY.LAUNCH, req.params.game])

        launch.stderr.on("data", (data) => {
            console.log(data)
        })

        launch.on("exit", () => {
            res.json({ status: 200 })
        })
    }

    getInstalledGames(req, res) {
        let array = []
        let installed = spawn(LEGENDARY.SELF, [LEGENDARY.LIST_INSTALLED, LEGENDARY.JSON_OPTION])

        installed.stdout.on("data", (data) => {
            let games = data.toString().replace("\r\n", "")
            array.push(JSON.parse(JSON.stringify(games)))
        })

        installed.stdout.on("end", () => {
            res.json({ installedGames: array })
        })
    }

    getAllGames(req, res) {
        let array = []
        let all = spawn(LEGENDARY.SELF, [LEGENDARY.LIST, LEGENDARY.JSON_OPTION])

        all.stdout.on("data", (data) => {
            let games = data.toString().replace("\r\n", "")
            array.push(JSON.parse(JSON.stringify(games)))
        })

        all.stdout.on("end", () => {
            res.json({ allGames: array })
        })
    }

    checkAuth(req, res) {
        return new Promise((resolve, reject) => {
            execFile(LEGENDARY.SELF, [LEGENDARY.LIST], (error, stdout, stderr) => {
                if (error) {
                    resolve(false)
                } else {
                    resolve(true)
                }
            })
        })
    }

    getAccount(req, res) {
        let child = execFile(LEGENDARY.SELF, [LEGENDARY.STATUS, LEGENDARY.JSON_OPTION])

        child.on("error", () => {
            res.json({ status: 404 })
        })

        child.stdout.on("data", (data) => {
            currentUser = JSON.parse(data.toString())

            res.json({ log: data.toString(), user: JSON.parse(data.toString()) })
        })
    }

    authenticate(req, res) {
        execFile(LEGENDARY.SELF, [LEGENDARY.AUTH], (error, stdout, stderr) => {
            if (error) {
                res.send(error);
                return;
            }
            let data = stderr.split("\r\n")

            let stillValid = data.includes("[cli] INFO: Stored credentials are still valid, if you wish to switch to a different account, run \"legendary auth --delete\" and try again.")
            let userClosed = data.includes("[cli] ERROR: WebView login attempt failed, please see log for details.")
            let loggedIn = data.includes("[WebViewHelper] INFO: Closing login window...")

            if (stillValid) {
                res.json({ status: 200 })
            } else if (userClosed) {
                res.json({ status: 401 })
            } else if (loggedIn) {
                res.json({ status: 200 })
            }
        })
    }

    load() {
        this.app.get('/', async (req, res) => {
            const isLogged = await this.checkAuth(req, res);

            if (isLogged) {
                res.redirect("/account")
            } else {
                res.render("auth")
            }
        });

        this.app.get("/account/downloads", (req, res) => {
            res.json({ progress, game, downloading, ETA, downloadSpd })
        })

        this.app.get("/account", (req, res) => {
            res.render("account")
        })

        this.app.get("/account/games", (req, res) => {
            res.render("games")
        })

        this.app.get("/account/settings", (req, res) => {
            const child = execFile(LEGENDARY.SELF, [LEGENDARY.STATUS, LEGENDARY.JSON_OPTION])

            child.stdout.on("data", (data) => {
                const json = JSON.parse(data)
                const configFile = fs.readFileSync(path.join(json.config_directory, "/config.ini"))
                const configContent = configFile.toString()
                const configIni = ini.parse(configContent)
                const disableUpdateCheck = configIni.Legendary.disable_update_check
                const disableUpdateNotice = configIni.Legendary.disable_update_notice
                const installationPath = configIni.Legendary.install_dir

                let disableUpdateCheckValue = "";

                if (disableUpdateCheck === true) {
                    disableUpdateCheckValue = "checked"
                } else {
                    disableUpdateCheckValue = ""
                }

                let disableUpdateNoticeValue = "";

                if (disableUpdateNotice === true) {
                    disableUpdateNoticeValue = "checked"
                } else {
                    disableUpdateNoticeValue = ""
                }

                res.render("settings", {
                    disableUpdateCheck: disableUpdateCheckValue,
                    disableUpdateNotice: disableUpdateNoticeValue,
                    installationPath
                })
            })
        })
    }
}