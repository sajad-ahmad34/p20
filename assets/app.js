document.addEventListener('DOMContentLoaded',function(){
  // Play button: inject iframe and hide preplay content only
  document.querySelectorAll('[data-testid="button-play-game"]').forEach(function(btn){
    var url = btn.getAttribute('data-embed-url');
    if(!url) return;
    btn.addEventListener('click',function(){
      var wrapper = btn.closest('.aspect-video');
      var ctn = document.getElementById('game-embed-container');
      if(!ctn && wrapper){
        ctn = document.createElement('div');
        ctn.id = 'game-embed-container';
        ctn.className = 'relative w-full h-full';
        wrapper.appendChild(ctn);
      }
      if(ctn){
        ctn.innerHTML = '';
        var ifr = document.createElement('iframe');
        ifr.src = url; ifr.allowFullscreen = true; ifr.sandbox = 'allow-scripts allow-same-origin allow-forms';
        ifr.style.width='100%'; ifr.style.height='100%';
        ctn.appendChild(ifr);
      }
      var existingFs = document.querySelector('[data-testid="button-play-fullscreen"]');
      if(!existingFs){
        var fsWrap = document.createElement('div');
        fsWrap.className = 'mb-6 mt-6';
        var fsBtn = document.createElement('a');
        fsBtn.href = url; fsBtn.target = '_blank'; fsBtn.rel = 'noopener';
        fsBtn.className = 'inline-flex items-center border rounded-md px-4 py-2 text-sm';
        fsBtn.setAttribute('data-testid','button-play-fullscreen');
        fsBtn.textContent = 'Play Fullscreen';
        fsWrap.appendChild(fsBtn);
        if(wrapper){ wrapper.insertAdjacentElement('afterend', fsWrap); }
      }
      // hide preplay ad/icon block and the play button, keep wrapper visible
      var preBlock = wrapper ? wrapper.querySelector('[data-testid="ad-preplay"], [data-testid="ad-preplay-fallback"]') : null;
      if(preBlock){ preBlock.style.display='none'; }
      btn.style.display='none';
    });
  });
  // Mobile menu toggle: create menu if missing
  var toggle = document.querySelector('[data-testid="button-menu-toggle"]');
  if(toggle){
    toggle.addEventListener('click',function(){
      var menu = document.getElementById('site-header-mobile-menu');
      if(menu){ menu.style.display = (menu.style.display==='block'?'none':'block'); return; }
      var header = toggle.closest('header'); if(!header) return;
      menu = document.createElement('div'); menu.id='site-header-mobile-menu'; menu.className='md:hidden py-4 space-y-2';
      var b = document.querySelector('[data-testid="link-browse"]');
      var c = document.querySelector('[data-testid="link-categories"]');
      function linkClone(a,testid){ if(!a) return null; var x=document.createElement('a'); x.href=a.getAttribute('href'); x.textContent=a.textContent||''; x.className='block px-3 py-2 rounded-md'; x.setAttribute('data-testid',testid); return x; }
      var lb = linkClone(b,'link-browse-mobile'); var lc = linkClone(c,'link-categories-mobile');
      if(lb) menu.appendChild(lb); if(lc) menu.appendChild(lc);
      header.appendChild(menu);
      menu.style.display='block';
    });
  }
});