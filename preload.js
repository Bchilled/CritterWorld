const { ipcRenderer } = require('electron');

window.electronAPI = {
  launchWorld:    (data)   => ipcRenderer.send('launch-world', data),
  hideWindow:     ()       => ipcRenderer.send('hide-window'),
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  onSetSpeed:     (cb)     => ipcRenderer.on('set-speed',    (_, v) => cb(v)),
  onSetMute:      (cb)     => ipcRenderer.on('set-mute',     (_, v) => cb(v)),
  onTogglePause:  (cb)     => ipcRenderer.on('toggle-pause', ()     => cb()),
  onResetWorld:   (cb)     => ipcRenderer.on('reset-world',  ()     => cb()),
  onOpenPanel:    (cb)     => ipcRenderer.on('open-panel',   (_, v) => cb(v)),
};
