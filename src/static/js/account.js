const elements = {
    name: $("#header-text"),
    navigation: $("#navigation"),
    loading: $("#loading"),
    loadingBackground: $("#loadingBackground"),
    logout: $(".logout")
}

$(() => {
    $.post("/api/account", (data) => {
        elements.loading.toggleClass("active");
        elements.loadingBackground.toggleClass("active");
        elements.name.text(`${data.user.account}, seja bem-vindo ao POLAARIS!`);
        elements.loading.removeClass("active");
        elements.loadingBackground.removeClass("active");
    })

    elements.logout.on("click", () => {
        elements.loading.toggleClass("active");
        elements.loadingBackground.toggleClass("active");
        $.post("/logout", (data) => {
            if (data.status === 200) {
                window.location.href = "/";
            } else {
                elements.loading.toggleClass("active");
                elements.loadingBackground.toggleClass("active");
                alert(data);
            }
        })
    })
})