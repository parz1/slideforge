const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("slideforge", {
  invoke(command, args = {}) {
    return ipcRenderer.invoke(`slideforge:${command}`, args);
  },
  openActivePreview(slide) {
    return ipcRenderer.invoke("active-preview:open", slide);
  },
  updateActivePreview(slide) {
    return ipcRenderer.invoke("active-preview:update-slide", slide);
  },
  onActiveSlideUpdated(callback) {
    const listener = (_event, slide) => callback(slide);
    ipcRenderer.on("active-preview:update", listener);
    return () => ipcRenderer.removeListener("active-preview:update", listener);
  },
  activePreviewReady() {
    return ipcRenderer.invoke("active-preview:ready");
  },
});
