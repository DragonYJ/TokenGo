const {contextBridge,ipcRenderer}=require('electron');
const allowed=new Set(['snapshot','scan','watch','quiet','save-image','copy-image','copy-text','share','open-repo','demo-toast','export','startup']);
contextBridge.exposeInMainWorld('tokenGo',{
 invoke:(action,payload)=>{if(!allowed.has(action))return Promise.reject(new Error('Unknown action'));return ipcRenderer.invoke('tokengo:action',action,payload);},
 onUpdate:callback=>{const fn=(_,value)=>callback(value);ipcRenderer.on('tokengo:update',fn);return()=>ipcRenderer.removeListener('tokengo:update',fn);},
 onToast:callback=>{const fn=(_,value)=>callback(value);ipcRenderer.on('tokengo:toast',fn);return()=>ipcRenderer.removeListener('tokengo:toast',fn);},
 toastAction:(action)=>{if(['close','open','share','pause','resume'].includes(action))ipcRenderer.send('tokengo:toast-action',action);}
});
