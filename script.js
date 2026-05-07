const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

const skins = {
  player: new Image(), amigo: new Image(), alien: new Image(),
  chefe: new Image(), chefe2: new Image(), fireball: new Image(), escudo: new Image()
};
skins.player.src = 'jogadorprincipal.png';
skins.amigo.src = 'amigo.png';
skins.alien.src = 'alien.png';
skins.chefe.src = 'chefe1.png';
skins.chefe2.src = 'chefe2.png';
skins.fireball.src = 'bola-defogo.png';
skins.escudo.src = 'escudo.png';

const somMenu = new Audio('menu.mp3');
const somTempo = new Audio('tempo.mp3');
const somTiroPlayer = new Audio('nave1.mp3');
const somTiroInimigo = new Audio('nave2.mp3');
somMenu.loop = true; somMenu.volume = 0.5;
somTempo.volume = 0.4; somTiroPlayer.volume = 0.3; somTiroInimigo.volume = 0.2;

let modo = 'menu', faseAtual = 1, tempoParado = false, contadorTempo = 0, lastTime = performance.now();
let avisandoHabilidade = false, bossMorrendo = false;
const player = { x:370, y:520, w:60, h:60, tx:370, vidas:3, danoTime:0, kills:0, cooldown:0, escudoAtivo: false, escudoTimer: 0 };
const amigo = { x:-150, y:450, w:60, h:60, tx:-150 };
let invasores = [], tiros = [], tirosE = [], particulas = [], keys = {}, frameAnim = 0;
const falasChefe = ["ZA WARUDO!", "O tempo é meu!", "Você não pode se mexer!", "Inútil! Inútil! Inútil!"];

window.permitirAudio = function() {
  $('overlay-start').style.display = 'none';
  $('menu-principal').style.display = 'block';
  somMenu.play().catch(e => console.log("Audio ready"));
  [somTempo, somTiroPlayer, somTiroInimigo].forEach(s => { s.play(); s.pause(); });
};

window.iniciarHistoria = function(){
  somMenu.pause(); $('menu-principal').style.display='none'; $('game-container').style.display='block'; modo='historia';
  amigo.tx = 200; player.tx = 500;
  falar("Hunter: Eu consigo derrotar esses alienígenas sozinho!", 2200, ()=>{
    falar("Amigo: Hunter, você enlouqueceu? São muitos!", 2200, ()=>{
      falar("Hunter: Vou mostrar do que sou capaz!", 1500, ()=>{
        modo='jogando'; amigo.tx = -200; player.tx = 370; criarFase();
      });
    });
  });
};

function falar(texto, tempo, cb){
  const box = $('dialogo-box'); box.innerText = texto; box.classList.add('show');
  setTimeout(()=>{ box.classList.remove('show'); if(cb) cb(); }, tempo);
}

function criarFase(){
  invasores=[]; tiros=[]; tirosE=[]; particulas=[]; avisandoHabilidade = false; bossMorrendo = false;
  player.escudoAtivo = false; player.escudoTimer = 0;
  const bossBar = $('boss-hp-bar'), bossLabel = $('boss-hp-label'), container = $('game-container');
  bossBar.style.display='none'; bossLabel.style.display='none'; container.classList.remove('shake');
  if(faseAtual % 10 === 0){
    bossBar.style.display='block'; bossLabel.style.display='block'; bossLabel.innerText = "MK-II: O ANULADOR";
    invasores.push({ x:300, y:80, w:180, h:150, hp:8000, maxHp:8000, isBoss:true, tipo:2, dir:1, vel:2.8 });
    invasores.push({ x:260, y:60, w:250, h:190, hp:600, maxHp:600, isShield:true });
  } else if(faseAtual % 5 === 0){
    bossBar.style.display='block'; bossLabel.style.display='block'; bossLabel.innerText = "CHEFE SUPREMO";
    const hp = 5000 + faseAtual*200;
    invasores.push({ x:300, y:80, w:200, h:160, hp:hp, maxHp:hp, isBoss:true, tipo:1, dir:1, vel:1.4 });
    const sHp = 400 + faseAtual*20;
    invasores.push({ x:260, y:60, w:280, h:200, hp:sHp, maxHp:sHp, isShield:true });
    for(let i=0;i<4;i++) invasores.push({ x:120 + i*170, y:330, w:55, h:55, vivo:true, dir:1, vel:1.2 });
  } else {
    const rows = 2 + Math.min(2, Math.floor(faseAtual/3));
    for(let r=0;r<rows;r++) for(let c=0;c<5;c++) invasores.push({ x: c*110 + 130, y: r*70 + 70, w:55, h:55, vivo:true, dir:1, vel: 0.8 + faseAtual*0.15 });
  }
}

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if(!tempoParado && modo==='jogando' && !bossMorrendo){
    if(e.code === 'KeyE' && player.kills >= 3){ tiros.push({ x: player.x+5, y: player.y-20, w:50, h:50, s:9, isFireball:true }); player.kills -= 3; }
    if(e.code === 'KeyR' && player.kills >= 2 && !player.escudoAtivo){ player.escudoAtivo = true; player.escudoTimer = 2000; player.kills -= 2; }
  }
  if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => keys[e.code] = false);

function explodir(x,y,color){
  for(let i=0;i<14;i++){
    const a = Math.random()*Math.PI*2, sp = 1 + Math.random()*3;
    particulas.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:30, color });
  }
}

function desenharNave(obj, color, isPlayer){
  ctx.save(); const cx = obj.x + obj.w/2, cy = obj.y + obj.h/2;
  const flutua = Math.sin(frameAnim*0.08 + obj.x*0.05) * 3;
  ctx.translate(cx, cy + flutua);
  if(!isPlayer && obj.dir) ctx.rotate(obj.dir * 0.1);
  if(isPlayer && player.danoTime > 0 && Math.floor(player.danoTime/4)%2) ctx.globalAlpha = 0.4;
  const img = isPlayer ? skins.player : (obj.x === amigo.x ? skins.amigo : skins.alien);
  if (img.complete && img.naturalWidth !== 0) ctx.drawImage(img, -obj.w/2, -obj.h/2, obj.w, obj.h);
  else {
    ctx.fillStyle = color;
    if(isPlayer){ ctx.beginPath(); ctx.moveTo(0,-obj.h/2); ctx.lineTo(obj.w/2,obj.h/2); ctx.lineTo(0,obj.h/3); ctx.lineTo(-obj.w/2,obj.h/2); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(0,0,obj.w/2,obj.h/2.2,0,0,Math.PI*2); ctx.fill(); }
  }
  
  // --- CORREÇÃO CRÍTICA AQUI ---
  // Antes: Tentava desenhar skins.escudo sem verificar se a imagem estava pronta.
  // Se skins.escudo estivesse corrompida ou lenta, drawImage quebrava o frame e sumia com tudo.
  if(isPlayer && player.escudoAtivo) {
    ctx.restore(); ctx.save(); ctx.translate(cx, cy + flutua); ctx.rotate(frameAnim * 0.1);
    
    // Verificação robusta: imagem existe, terminou de carregar e tem dimensões válidas.
    if(skins.escudo && skins.escudo.complete && skins.escudo.naturalWidth !== 0) { 
        ctx.globalAlpha = 0.6; ctx.drawImage(skins.escudo, -obj.w*0.8, -obj.h*0.8, obj.w*1.6, obj.h*1.6); 
    } else {
        // Fallback: Se a imagem falhar, desenha um círculo neon azul para garantir que o jogo não "suma".
        ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, obj.w*0.8, 0, Math.PI*2); ctx.stroke();
    }
  }
  // ------------------------------
  ctx.restore();
}

function desenharBoss(obj){
  ctx.save(); ctx.translate(obj.x + obj.w/2, obj.y + obj.h/2 + Math.sin(frameAnim*0.05)*6);
  if(bossMorrendo) ctx.filter = `hue-rotate(${frameAnim*15}deg) brightness(2)`;
  const img = obj.tipo === 2 ? skins.chefe2 : skins.chefe;
  if(img.complete) ctx.drawImage(img, -obj.w/2, -obj.h/2, obj.w, obj.h);
  ctx.restore();
}

function desenharEscudoBoss(obj){
  ctx.save(); ctx.translate(obj.x + obj.w/2, obj.y + obj.h/2);
  if(skins.escudo.complete) { ctx.globalAlpha = 0.4; ctx.drawImage(skins.escudo, -obj.w/2, -obj.h/2, obj.w, obj.h); }
  ctx.restore();
}

function desenharFireball(t){
  ctx.save(); ctx.translate(t.x + t.w/2, t.y + t.h/2); ctx.rotate(frameAnim*0.3);
  if(skins.fireball.complete) ctx.drawImage(skins.fireball, -t.w/2, -t.h/2, t.w, t.h);
  ctx.restore();
}

function colide(a,b){ return a.x < b.x+b.w && a.x+(a.w||6) > b.x && a.y < b.y+b.h && a.y+(a.h||20) > b.y; }

function gameLoop(now){
  const dt = Math.min(32, now - lastTime); lastTime = now; frameAnim += dt * 0.06;
  ctx.clearRect(0,0,800,600);
  if(modo === 'menu') { requestAnimationFrame(gameLoop); return; }
  const lerp = 1 - Math.pow(0.001, dt/1000);
  player.x += (player.tx - player.x) * lerp; amigo.x += (amigo.tx - amigo.x) * lerp;
  if(player.danoTime>0) player.danoTime -= dt/16;
  if(player.cooldown>0) player.cooldown -= dt;
  if(player.escudoAtivo){ player.escudoTimer -= dt; if(player.escudoTimer <= 0) player.escudoAtivo = false; }
  if(amigo.x > -100) desenharNave(amigo, '#00d2ff', false);
  desenharNave(player, '#00ff88', true);
  if(modo !== 'jogando'){ requestAnimationFrame(gameLoop); return; }

  $('fase-txt').innerText = faseAtual; $('vidas-txt').innerText = player.vidas;
  $('hab-txt').innerText = Math.min(Math.floor(player.kills),3);

  const boss = invasores.find(i=>i.isBoss && i.hp>0);
  const shield = invasores.find(i=>i.isShield && i.hp>0);

  if(boss && boss.tipo === 2 && !tempoParado && !bossMorrendo){
    tiros.forEach(t => {
      if(!t.isFireball && Math.abs(t.x - (boss.x + boss.w/2)) < 130 && t.y > boss.y){
        const f = 8;
        if(boss.x < 120) boss.x += f; else if(boss.x > 680-boss.w) boss.x -= f;
        else boss.x += (t.x < boss.x + boss.w/2) ? f : -f;
      }
    });
  }

  if(boss && boss.tipo === 1 && !tempoParado && !avisandoHabilidade){
    contadorTempo += dt/1000;
    if(contadorTempo >= 7){
      avisandoHabilidade = true;
      falar(falasChefe[Math.floor(Math.random()*4)], 1000, ()=>{
        tempoParado = true; somTempo.play(); $('efeito-tempo').style.display='block';
        setTimeout(()=>{ tempoParado=false; contadorTempo=0; avisandoHabilidade=false; $('efeito-tempo').style.display='none'; }, 2500);
      });
    }
  }

  if(!tempoParado && !bossMorrendo){
    if((keys.ArrowLeft || keys.KeyA) && player.tx > 10) player.tx -= 0.5*dt;
    if((keys.ArrowRight || keys.KeyD) && player.tx < 740) player.tx += 0.5*dt;
    if(keys.Space && player.cooldown <= 0){
      tiros.push({ x: player.x+27, y: player.y, w:6, h:18, s:11 });
      player.cooldown = 220; somTiroPlayer.currentTime = 0; somTiroPlayer.play();
    }
  }

  for(let i=tiros.length-1;i>=0;i--){
    tiros[i].y -= tiros[i].s * (dt/16);
    if(tiros[i].y < -100) tiros.splice(i,1);
    else {
      for(const inv of invasores){
        if((inv.vivo || inv.hp>0) && colide(tiros[i], inv)){
          if(inv.isShield) inv.hp -= 50; else if(inv.isBoss) { if(!shield) inv.hp -= 50; } else { inv.vivo=false; player.kills++; explodir(inv.x,inv.y,'#ff0055'); }
          if(!tiros[i].isFireball) { tiros.splice(i,1); break; }
        }
      }
    }
  }

  let vivos = 0, edge = false;
  invasores.forEach(inv => {
    if(inv.isBoss?inv.hp>0:(inv.isShield?inv.hp>0:inv.vivo)){
      if(!inv.isShield) vivos++;
      if(!tempoParado && !bossMorrendo){
        inv.x += inv.vel * inv.dir * (dt/16); if(inv.x>750 || inv.x<10) edge=true;
        if(Math.random()<0.005) { tirosE.push({x:inv.x+25, y:inv.y+50}); somTiroInimigo.currentTime=0; somTiroInimigo.play(); }
      }
      if(inv.isBoss) desenharBoss(inv); else if(inv.isShield) desenharEscudoBoss(inv); else desenharNave(inv,'#ff0055',false);
    }
  });

  if(edge) invasores.forEach(inv => { if(!inv.isShield){ inv.dir*=-1; inv.y+=12; } });
  if(vivos===0 && !bossMorrendo){ faseAtual++; criarFase(); }

  tirosE.forEach((te,i) => {
    te.y += 5; if(colide(te, player)){ if(!player.escudoAtivo) player.vidas--; tirosE.splice(i,1); }
  });

  particulas.forEach((p,i)=>{
    p.x+=p.vx; p.y+=p.vy; p.life--; if(p.life<=0) particulas.splice(i,1);
    else { ctx.globalAlpha=p.life/30; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,3,3); ctx.globalAlpha=1; }
  });

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
