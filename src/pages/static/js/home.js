let loading = $("#loading")
let loadingBackground = $("#loadingBackground")

$(() => {
    loading.removeClass("active")
    loadingBackground.removeClass("active")

    electron.send("get-legendary-account");
    loading.addClass("active")
    loadingBackground.addClass("active")
    electron.receive("legendary-account", (event, args) => {
        loading.removeClass("active")
        loadingBackground.removeClass("active")
        let json = JSON.parse(event);
        $("#header-text").text(json.account)
    })

    $("a").on("click", (e) => {
        let id = e.target.id;
        loading.addClass("active")
        loadingBackground.addClass("active")

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

    $(".logout").on("click", () => {
        loading.addClass("active")
        loadingBackground.addClass("active")
        electron.send("logout-legendary");
    })
})