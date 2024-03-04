let loginButton = $("#handle-login")
let loading = $("#loading")
let loadingBackground = $("#loadingBackground")

$(() => {
    loading.removeClass("active")
    loadingBackground.removeClass("active")
    electron.send("download-legendary")

    loginButton.on("click", () => {
        loading.addClass("active")
        loadingBackground.addClass("active")
        electron.send("login-legendary")
    })
})