const elements = {
    save: $("#save"),
    loading: $("#loading"),
    loadingBackground: $("#loadingBackground"),
    disableUpdateCheck: $("#disable-update-check"),
    disableUpdateNotice: $("#disable-update-notice"),
    newPath: $("#newPath"),
    status: $("#status"),
    migrate: $("#migrate")
}

elements.loading.addClass("active")
elements.loadingBackground.addClass("active")

$(() => {
    elements.loading.removeClass("active")
    elements.loadingBackground.removeClass("active")

    elements.save.on("click", saveSettings);
    elements.migrate.on("click", migrateGames);
})

function toggleLoadingState() {
    elements.loading.toggleClass("active");
    elements.loadingBackground.toggleClass("active");
}

function saveSettings() {
    const data = {
        disableUpdateCheck: elements.disableUpdateCheck.prop("checked"),
        disableUpdateNotice: elements.disableUpdateNotice.prop("checked"),
        installationPath: elements.newPath.val().replace("\n", "")
    }

    toggleLoadingState();

    $.post("/api/legendary/config", data, (response) => {
        elements.status.css("color", "lightgreen");
        elements.status.text("Configurações Salvas");
        toggleLoadingState();
        window.location.reload()
    })
}

function migrateGames() {
    toggleLoadingState();

    $.post("/api/legendary/migrate", (response) => {
        if (response.status === 200) {
            alert("Jogo Migrado com Sucesso");
            toggleLoadingState();
            window.location.reload()
        }
    })
}