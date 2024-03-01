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

function toggleLoadingState() {
    elements.loading.toggleClass("active");
    elements.loadingBackground.toggleClass("active")
}

let allGames;
let installedGames;

toggleLoadingState();

$(() => {
    toggleLoadingState();


    $.post("/api/account/games", (data) => {
        allGames = JSON.parse(data.allGames[0]);

        $.post("/api/account/games/installed", (data2) => {
            installedGames = JSON.parse(data2.installedGames);
            updateGameList(allGames, installedGames);
            toggleLoadingState();
        })
    })

    elements.installed_games.on("click", () => {
        let otherElementContainClass = elements.all_games.hasClass("active")

        if (otherElementContainClass) {
            elements.gameList.html("")
            updateGameList(allGames, installedGames, true)
            elements.all_games.removeClass("active")
            elements.installed_games.addClass("active")
        }
    })

    elements.all_games.on("click", () => {
        let otherElementContainClass = elements.installed_games.hasClass("active")

        if (otherElementContainClass) {
            elements.gameList.html("")
            updateGameList(allGames, installedGames, false)
            elements.installed_games.removeClass("active")
            elements.all_games.addClass("active")
        }
    })

    elements.gameSwitch.on("change", () => {
        elements.gameList.toggleClass("list-view")
    })

    elements.logout.on("click", () => {
        toggleLoadingState();
        $.post("/logout", (data) => {
            if (data.status === 200) {
                window.location.href = "/";
            } else {
                alert(data);
            }
        })
    })
})

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

    modalContent.append(button);

    button.on("click", () => {
        $.post("/api/epic/cancel/", (data) => {
            if (data.status === 200) {
                modal.css("display", "none");
            }
        })
    })

    modal.css("display", "block");

    const updateDownloadProgress = setInterval(() => {
        $.get("/account/downloads", (data, status) => {
            if (data.game.toLowerCase() !== game) return;

            if (data.progress >= 100) {
                setTimeout(() => {
                    clearInterval(updateDownloadProgress);
                    etaElement.text(`Tempo estimado: ${data.ETA}`);
                    downloadElementValue.text(`100%`)
                    modal.css("display", "none");
                }, 4000);
                return;
            }

            etaElement.text(`Tempo estimado: ${data.ETA}`);
            downloadElementValue.text(`${data.progress}%`)
            downloadElement.val(data.progress);
            downloadSpd.text(`${data.downloadSpd} MiB/s`)
        })
    }, 1000)
}

function updateGameList(allGames, installedGame, showInstalled = false) {
    elements.installed_games.text(`Instalados (${installedGame.length})`);
    elements.all_games.text(`Todos (${allGames.length})`);

    allGames.forEach((game) => {
        const isInstalled = installedGames.some((g) => g.app_name === game.app_name);

        if ((showInstalled && !isInstalled) || (!showInstalled && isInstalled)) {
            return;
        }

        const gameItem = $("<div></div>");
        gameItem.addClass("game");
        const gameInfo = $("<div></div>");
        gameInfo.addClass("game-info");
        const gameName = $("<p></p>");
        gameName.addClass("game-name");
        gameName.text(game.metadata.title);
        const gameCover = $("<img>");
        const correctImage = game.metadata.keyImages[1]
        gameCover.attr("src", correctImage.url);
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
    })

    $(".play-button").on("click", (e) => {
        toggleLoadingState();

        const game = e.target.id;

        $.post(`/api/epic/launch/${game}`, (data) => {
            if (data.status === 200) {
                toggleLoadingState();
                alert(data);
            }
        })
    })

    Promise.all($("img"))

    $(".install-button").on("click", (e) => {
        const game = e.target.id;

        startDownload(game);

        $.post(`/api/epic/install/${game}`, (data) => {
            if (data.status === 200) {
                let timer = 4;

                const interval = setInterval(() => {
                    if (timer === 0) {
                        clearInterval(interval);
                        return;
                    }

                    timer--;
                    elements.downloadStats.text(`Jogo baixado com sucesso!\n\nReiniciando em ${timer} segundos...`);
                }, 1000);

                setTimeout(() => {
                    location.reload();
                }, 4000);
            }
        })
    })

    $(".uninstall-button").on("click", (e) => {
        const game = e.target.id;
        toggleLoadingState();
        $.post(`/api/epic/uninstall/${game}`, (data) => {
            toggleLoadingState();

            if (data.status === 200) {
                $(".uninstall-button").prop("disabled");
                $(".play-button").prop("disabled");
                $(".open-location-button").prop("disabled");
                alert('Jogo desinstalado com sucesso.');
                location.reload();
            }
        })
    })

    $(".open-location-button").on("click", (e) => {
        const game = e.target.id;

        installedGames.forEach((g) => {
            if (g.title.toLowerCase() === game) {
                window.api.openPath(`${g.install_path}`)
            }
        });
    })
}

function search(query) {
    let allGames = $(".game")

    allGames = Array.from(allGames)

    allGames.forEach(game => {
        let info = game.querySelector(".game-info")
        let name = info.querySelector(".game-name")

        if (name.textContent.toLowerCase().includes(query.toLowerCase())) {
            game.style.display = '';
        } else {
            game.style.display = 'none';
        }
    })
}

