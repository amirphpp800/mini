// Minimal background script placeholder to avoid 404 during local dev
(() => {
  const canvas = document.getElementById('bg-net');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  // simple subtle animation
  let t=0;
  function tick(){
    t+=0.01;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#ffffff';
    for(let i=0;i<80;i++){
      const x = (Math.sin(t*0.7+i)*0.5+0.5)*canvas.width;
      const y = (Math.cos(t*0.9+i)*0.5+0.5)*canvas.height;
      ctx.beginPath();
      ctx.arc(x,y,1.2,0,Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
