(function(){
  const PageViewer = {
    overlay: null,
    iframe: null,
    show(url){
      if(!url) return;
      if(!this.overlay){
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';
        const box = document.createElement('div');
        box.style.cssText = 'position:relative;width:90vw;height:90vh;background:#111;border:1px solid #334155;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.4);overflow:hidden;';
        const close = document.createElement('button');
        close.textContent = '✕';
        close.title = '关闭';
        close.style.cssText = 'position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:14px;cursor:pointer;z-index:2;';
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:100%;height:100%;border:0;background:#0b1220;';
        close.onclick = ()=>PageViewer.hide();
        box.appendChild(close);
        box.appendChild(iframe);
        overlay.appendChild(box);
        overlay.addEventListener('click',(e)=>{ if(e.target===overlay) PageViewer.hide(); });
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.iframe = iframe;
      }
      this.iframe.src = url;
      this.overlay.style.display = 'flex';
    },
    hide(){
      if(this.overlay) this.overlay.style.display = 'none';
    }
  };
  window.PageViewer = PageViewer;
  const btn = document.getElementById('openDemoPageBtn');
  if(btn){
    btn.addEventListener('click', ()=>{
      PageViewer.show('../demos/equirect/index.html');
    });
  }
})();
