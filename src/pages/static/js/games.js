const elements = {
    gameSwitch: $("#game-switch"),
    gameList: $(".game-list"),
    downloadStats: $("#downloadStatus"),
    progressBar: $("#progress-bar"),
    loading: $("#loading"),
    loadingBackground: $("#loadingBackground"),
    downloadButton: $(".install-button"),
    all_games: $("#all-games"),
    installed_games: $("#installed-games"),
    logout: $(".logout")
}

let activeATag = true

function startDownload(game) {
    const gameName = $("#gameName"),
        modal = $("#modal"),
        modalContent = $(".modal-content"),
        downloadElement = $("#downloadProgress"),
        etaElement = $("#eta"),
        downloadElementValue = $("#downloadProgressValue"),
        downloadSpd = $("#downloadSpd");

    gameName.addClass("polaaris2");
    gameName.text(game.toUpperCase());
    downloadElement.val(0);

    const button = $("<button></button>");
    button.text("Cancelar");
    button.attr("id", "cancelDownload");
    button.addClass("cancel-button");

    const hideButton = $("<button></button>");
    hideButton.text("Fechar");
    hideButton.attr("id", "hideModal");
    hideButton.addClass("hide-button");

    const downloadPopup = $("#downloadPopupProgress");

    modalContent.append(button);
    modalContent.append(hideButton);

    button.on("click", () => {
        toggleLoadingState();

        electron.send("cancel-download")
    })

    modal.css("display", "block");

    hideButton.on("click", () => {
        modal.css("display", "none");
        downloadPopup.css("display", "flex");
    })

    downloadPopup.on("click", () => {
        downloadPopup.css("display", "none");
        modal.css("display", "block")
    })

    electron.receive("download-status", (event, args) => {
        activeATag = false;

        if (event.game.toLowerCase() === game) {
            downloadElement.val(event.progress);
            etaElement.text(`Tempo estimado: ${event.ETA}`);
            downloadElementValue.text(`${event.progress}%`);
            downloadSpd.text(`${event.downloadSpd} MiB/s`)
            $("#downloadPopupProgressValue").val(event.progress)

            if (event.progress >= 100) {
                return location.reload();
            }
        }
    })
}

function updateGameList(allGames, installedGames, showInstalled = false) {
    elements.installed_games.text(`Instalados (${installedGames.length})`);
    elements.all_games.text(`Todos (${allGames.length})`);

    allGames.forEach(game => {
        const isInstalled = installedGames.some(g => g.app_name === game.app_name);

        if ((showInstalled && !isInstalled) || (!showInstalled && isInstalled)) return;

        const gameItem = $("<div></div>");
        gameItem.addClass("game");

        const gameInfo = $("<div></div>");
        gameInfo.addClass("game-info");

        const gameName = $("<p></p>")
        gameName.addClass("game-name");
        gameName.text(game.metadata.title);

        const gameCover = $("<img>");
        const correctImage = game.metadata.keyImages[1];
        gameCover.attr("src", correctImage.url);
        gameCover.attr("loading", "lazy")

        const gamePlay = $("<button></button>");
        gamePlay.attr("id", game.metadata.title.toLowerCase());
        gamePlay.addClass(isInstalled ? "play-button" : "install-button");
        gamePlay.text(isInstalled ? "Jogar" : "Instalar");

        if (isInstalled) {
            const uninstallButton = $("<button></button>");
            uninstallButton.attr("id", game.metadata.title.toLowerCase());
            uninstallButton.addClass("uninstall-button");
            uninstallButton.text("Desinstalar");

            const openLocationButton = $("<button></button>");
            openLocationButton.attr("id", game.metadata.title.toLowerCase());
            openLocationButton.addClass("open-location-button");
            openLocationButton.text("Abrir Local do Jogo");

            gameInfo.append(gameName, gamePlay, openLocationButton, uninstallButton);
        } else {
            gameInfo.append(gameName, gamePlay);
        }

        gameItem.append(gameCover, gameInfo);
        elements.gameList.append(gameItem);

        Promise.all($("img"))
    })

    $(".play-button").on("click", (e) => {
        toggleLoadingState();

        const game = e.target.id;

        electron.send("play-game", {
            game
        })
    })

    $(".install-button").on("click", (e) => {
        const game = e.target.id;

        $(".install-button").attr("disabled", "disabled");

        startDownload(game)

        electron.send("install-game", {
            game
        })
    })

    $(".uninstall-button").on("click", (e) => {
        const game = e.target.id;
        toggleLoadingState();

        electron.send("uninstall-game", {
            game
        })
    })

    $(".open-location-button").on("click", (e) => {
        const game = e.target.id;

        installedGames.forEach(g => {
            if (g.title.toLowerCase() === game) {
                electron.path(`${g.install_path}`)
            }
        })
    })
}

function search(query) {
    let allGames = $(".game");

    allGames = Array.from(allGames);

    allGames.forEach(game => {
        let info = game.querySelector(".game-info");
        let name = info.querySelector(".game-name");

        if (name.textContent.toLowerCase().includes(query.toLowerCase())) {
            game.style.display = "";
        } else {
            game.style.display = "none"
        }
    })
}


let allGames;
let installedGames;

$(() => {

    electron.send("retrieve-games");
    electron.receive("legendary-games", (event, args) => {
        installedGames = JSON.parse(event.installedGames);
        allGames = JSON.parse(event.allGames[0]);
        toggleLoadingState()
        updateGameList(allGames, installedGames);
    })

    $(".installed-button").on("click", () => {
        activeATag = false;
    })

    $("a").on("click", (e) => {
        if (activeATag) {
            let id = e.target.id;
            toggleLoadingState();

            switch (id) {
                case "go-home":
                    electron.send("change-window", {
                        requestedUrl: "home"
                    })
                    break;
                case "go-games":
                    electron.send("change-window", {
                        requestedUrl: "games"
                    })
                    break;
                case "go-settings":
                    electron.send("change-window", {
                        requestedUrl: "settings"
                    })
                    break;
            }
        }
    })

    elements.installed_games.on("click", () => {
        let otherElementContainClass = elements.all_games.hasClass("active");

        if (otherElementContainClass) {
            elements.gameList.html("");
            updateGameList(allGames, installedGames, true);
            elements.all_games.removeClass("active");
            elements.installed_games.addClass("active");
        }
    })

    elements.all_games.on("click", () => {
        let otherElementContainClass = elements.installed_games.hasClass("active");

        if (otherElementContainClass) {
            elements.gameList.html("");
            updateGameList(allGames, installedGames, false);
            elements.installed_games.removeClass("active");
            elements.all_games.addClass("active");
        }
    })

    elements.logout.on("click", () => {
        toggleLoadingState();
        electron.send("logout-legendary");
    })

    elements.gameSwitch.on("change", () => {
        elements.gameList.toggleClass("list-view")
    })
})

function toggleLoadingState() {
    elements.loading.toggleClass("active")
    elements.loadingBackground.toggleClass("active")
}