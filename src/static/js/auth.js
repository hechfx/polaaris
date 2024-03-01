const elements = {
    loading: $("#loading"),
    loadingBackground: $("#loadingBackground"),
    login: $("#handle-login")
}

elements.loading.toggleClass("active");
elements.loadingBackground.toggleClass("active");

$(() => {
    elements.loading.removeClass("active");
    elements.loadingBackground.removeClass("active");

    elements.login.on("click", () => {
        elements.loading.toggleClass("active");
        elements.loadingBackground.toggleClass("active");
        $.post("/api/epic/auth", (data) => {
            if (data.status === 200) {
                window.location.href = "/account";
            } else {
                window.location.href = "/";
            }
        })
    })
})