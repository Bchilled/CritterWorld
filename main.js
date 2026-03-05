const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage } = require('electron');
const path = require('path');

let win  = null;
let tray = null;

// 3-STATE LEFT CLICK: 0=visible+sound  1=visible+muted  2=hidden+muted
let clickState = 0;

function cycleClick() {
  clickState = (clickState + 1) % 3;
  if (clickState === 0) {
    win.show(); win.setAlwaysOnTop(true,'screen-saver');
    win.webContents.send('set-mute',false);
    tray.setToolTip('CritterWorld');
  } else if (clickState === 1) {
    win.show();
    win.webContents.send('set-mute',true);
    tray.setToolTip('CritterWorld — Muted');
  } else {
    win.hide();
    tray.setToolTip('CritterWorld — Hidden');
  }
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label:'⚙  Settings', submenu:[
      { label:'Speed ½x', click:()=>win.webContents.send('set-speed',0.5) },
      { label:'Speed 1x',  click:()=>win.webContents.send('set-speed',1)   },
      { label:'Speed 2x',  click:()=>win.webContents.send('set-speed',2)   },
      { label:'Speed 4x',  click:()=>win.webContents.send('set-speed',4)   },
      { type:'separator' },
      { label:'Pause',        click:()=>win.webContents.send('toggle-pause')  },
      { label:'Reset World',  click:()=>win.webContents.send('reset-world')   },
    ]},
    { type:'separator' },
    { label:'🎒  Items',                click:()=>win.webContents.send('open-panel','items')   },
    { label:'📬  Messages',             click:()=>win.webContents.send('open-panel','messages') },
    { label:'📖  Species Field Journal',click:()=>win.webContents.send('open-panel','journal')  },
    { type:'separator' },
    { label: clickState===0?'🔇  Mute':clickState===1?'👁  Hide':'▶  Restore', click:cycleClick },
    { type:'separator' },
    { label:'✕  Quit', click:()=>app.quit() },
  ]);
}

function createWindow() {
  const { width:sw, height:sh } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width:sw, height:220, x:0, y:sh-220,
    frame:false, transparent:true, alwaysOnTop:true,
    skipTaskbar:true, resizable:false, hasShadow:false,
    webPreferences:{ nodeIntegration:true, contextIsolation:false, preload:path.join(__dirname,'preload.js') }
  });
  win.loadFile('intro.html');
  win.setAlwaysOnTop(true,'screen-saver');
  if(process.argv.includes('--dev')) win.webContents.openDevTools({mode:'detach'});
}

function createTray() {
  let icon;
  try { icon = nativeImage.createFromPath(path.join(__dirname,'assets','tray.png')); }
  catch(e) { icon = nativeImage.createEmpty(); }
  tray = new Tray(icon);
  tray.setToolTip('CritterWorld');
  tray.on('click', cycleClick);
  tray.on('right-click', ()=>tray.popUpContextMenu(buildMenu()));
}

ipcMain.on('launch-world', (_,data)=>{
  if(win) win.loadFile('src/index.html',{query:{player:JSON.stringify(data)}});
});
ipcMain.on('set-ignore-mouse', (_,v)=>{ if(win) win.setIgnoreMouseEvents(v,{forward:true}); });
ipcMain.on('hide-window', ()=>{ clickState=2; if(win) win.hide(); tray&&tray.setToolTip('CritterWorld — Hidden'); });

app.whenReady().then(()=>{ createWindow(); createTray(); });
app.on('window-all-closed', ()=>{});
app.on('before-quit', ()=>{ if(tray) tray.destroy(); });
