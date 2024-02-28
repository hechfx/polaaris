const { ipcRenderer, contextBridge, shell } = require('electron')

contextBridge.exposeInMainWorld("api", {
    send: (data) => {
        ipcRenderer.send(data)
    },
    openPath: (path) => {
        ipcRenderer.send("open-path", path)
    }
})

