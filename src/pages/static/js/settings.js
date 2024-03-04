const elements = {
    save: $("#save"),
    loading: $("#loading"),
    loadingBackground: $("#loadingBackground"),
    disableUpdateCheck: $("#disable-update-check"),
    disableUpdateNotice: $("#disable-update-notice"),
    newPath: $("#newPath"),
    currentPath: $("#currentPath"),
    status: $("#status"),
    migrate: $("#migrate")
}

function toggleLoadingState() {
    elements.loading.toggleClass("active");
    elements.loadingBackground.toggleClass("active");
}

toggleLoadingState();

$(() => {
    toggleLoadingState();

    $("a").on("click", (e) => {
        let id = e.target.id;
        console.log(id)
        toggleLoadingState()

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
    })

    electron.send("send-settings")
    electron.receive("legendary-settings", (event, args) => {
        elements.disableUpdateCheck.prop("checked", event.disableUpdateCheck);
        elements.disableUpdateNotice.prop("checked", event.disableUpdateNotice);
        elements.currentPath.text(event.installationPath);
    })

    elements.save.on("click", saveSettings);
    elements.migrate.on("click", migrateGames);
})

function saveSettings() {
    const data = {
        disableUpdateCheck: elements.disableUpdateCheck.prop("checked"),
        disableUpdateNotice: elements.disableUpdateNotice.prop("checked"),
        installationPath: elements.newPath.val().replace("\n", "")
    }

    elements.status.css("color", "lightgreen");
    elements.status.text("Configurações Salvas");

    toggleLoadingState();

    electron.send("save-settings", data);
}

function migrateGames() {
    toggleLoadingState();

    electron.send("migrate-game")
}