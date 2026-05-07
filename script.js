const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

// Carregamento de Skins (Imagens)
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

// Sistema de Áudio
const somMenu = new Audio('menu.mp3');
const somTempo = new Audio('tempo.mp3');
const somTiroPlayer = new Audio('nave1.mp3');
const somTiroInimigo = new Audio('nave2.mp3');
somMenu.loop = true;
somMenu.volume = 0.5;

// Variáveis de Controle
let modo = 'menu', faseAtual = 1, tempoParado = false, contadorTempo = 0, lastTime = performance.now();
let avisandoHabilidade = false, bossMorrendo = false, frameAnim = 0;

const player = { x:370, y:520, w:60, h:60, tx:370, vidas:3, danoTime:0, kills:0, cooldown:0, escudoAtivo: false, escudoTimer: 0 };
const amigo = { x:-150, y:450, w:60, h:60, tx:-150 };
let invasores = [], tiros = [], tirosE = [], particulas = [], keys = {};
const falasChefe = ["ZA WARUDO!", "O tempo é meu!", "Você não pode se mexer!", "Inútil! Inútil! Inútil!"];

// Funções de Inicialização
window.permitirAudio = function() {
    $('overlay-start').style.display = 'none';
    $('menu-principal').style.display = 'block';
    somMenu.play().catch(e => console.log("Áudio ativado"));
};

window.iniciarHistoria = function(){
  somMenu.pause(); 
  $('menu-principal').style.display='none'; 
  $('game-container').style.display='block'; 
  modo='historia';
  amigo.tx = 200; player.tx = 500;
  falar("Hunter: Eu consigo derrotar esses alienígenas sozinho!", 2200, ()=>{
    falar("Amigo: Hunter, você enlouqueceu? São muitos!", 2200, ()=>{
      falar("Hunter: Vou mostrar do que sou capaz!", 1500, ()=>{
        modo='jogando';
        amigo.tx = -200; player.tx = 370;
        criarFase();
      });
    });
  });
};

function falar(texto, tempo, cb){
  const box = $('dialogo-box'); 
  box.innerText = texto; 
  box.classList.add('show');
  setTimeout(()=>{ box.classList.remove('show'); if(cb) cb(); }, tempo);
}

// Criador de Níveis (Dificuldade Ajustada)
function criarFase(){
  invasores=[]; tiros=[]; tirosE=[]; particulas=[]; bossMorrendo = false;
  const bossBar = $('boss-hp-bar'), bossLabel = $('boss-hp-label');
  bossBar.style.display='none'; bossLabel.style.display='none';
  
  if(faseAtual % 10 === 0){
    bossBar.style.display='block'; bossLabel.style.display='block'; bossLabel.innerText = "MK-II: O ANULADOR";
    // VIDA REDUZIDA: de 8000 para 3000
    invasores.push({ x:300, y:80, w:180, h:150, hp:3000, maxHp:3000, isBoss:true, tipo:2, dir:1, vel:3.0 });
    invasores.push({ x:260, y:60, w:250, h:190, hp:500, maxHp:500, isShield:true });
  } else if(faseAtual % 5 === 0){
    bossBar.style.display='block'; bossLabel.style.display='block'; bossLabel.innerText = "CHEFE SUPREMO";
    const hp = 4000 + faseAtual*150;
    invasores.push({ x:300, y:80, w:200, h:160, hp:hp, maxHp:hp, isBoss:true, tipo:1, dir:1, vel:1.4 });
    invasores.push({ x:260, y:60, w:280, h:200, hp:400, maxHp:400, isShield:true });
  } else {
    for(let r=0;r<3;r++) for(let c=0;c<6;c++) invasores.push({ x: c*100 + 150, y: r*60 + 80, w:50, h:50, vivo:true, dir:1, vel: 0.8 + faseAtual*0.12 });
  }
}

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if(modo==='jogando' && !tempoParado){
    if(e.code === 'KeyE' && player.kills >= 3){ 
        tiros.push({ x: player.x+5, y: player.y-20, w:50, h:50, s:9, isFireball:true }); 
        player.kills -= 3; 
    }
    if(e.code === 'KeyR' && player.kills >= 2 && !player.escudoAtivo){ 
        player.escudoAtivo = true; player.escudoTimer = 2000; player.kills -= 2; 
    }
  }
});
window.addEventListener('keyup', e => keys[e.code] = false);

function gameLoop(now){
  const dt = Math.min(32, now - lastTime); 
  lastTime = now; 
  frameAnim += dt * 0.06;
  ctx.clearRect(0,0,800,600);

  if(modo === 'menu') { requestAnimationFrame(gameLoop); return; }

  const lerp = 1 - Math.pow(0.001, dt/1000);
  player.x += (player.tx - player.x) * lerp;
  if(player.danoTime>0) player.danoTime -= dt/16;
  if(player.escudoAtivo){ player.escudoTimer -= dt; if(player.escudoTimer <= 0) player.escudoAtivo = false; }

  desenharNave(player, '#00ff88', true);
  if(modo !== 'jogando'){ requestAnimationFrame(gameLoop); return; }
  
  $('fase-txt').innerText = faseAtual; 
  $('vidas-txt').innerText = player.vidas;
  $('hab-txt').innerText = Math.floor(player.kills);

  const boss = invasores.find(i=>i.isBoss && i.hp > 0);
  const shield = invasores.find(i=>i.isShield && i.hp > 0);

  // --- LÓGICA DE MOVIMENTAÇÃO FLUIDA (BOSS 2) ---
  if(boss && boss.tipo === 2 && !tempoParado){
      let alvoX = boss.x;
      tiros.forEach(t => {
          if(!t.isFireball && Math.abs(t.x - (boss.x + boss.w/2)) < 120 && t.y > boss.y){
              // Esquiva suave
              if(boss.x < 100) alvoX += 10;
              else if(boss.x > 700 - boss.w) alvoX -= 10;
              else alvoX += (t.x < boss.x + boss.w/2) ? 10 : -10;
          }
      });
      // Aplica o movimento com lerp para ser fluido
      boss.x += (alvoX - boss.x) * 0.15;
      
      // Movimento lateral base
      boss.x += boss.vel * boss.dir;
      if(boss.x > 780 - boss.w || boss.x < 20) { boss.dir *= -1; }
      
      // Manter dentro da tela
      if(boss.x < 10) boss.x = 10;
      if(boss.x > 790 - boss.w) boss.x = 790 - boss.w;
  }

  // --- LÓGICA DE TEMPO (BOSS 1) ---
  if(boss && boss.tipo === 1 && !tempoParado && !avisandoHabilidade){
    contadorTempo += dt/1000;
    if(contadorTempo >= 7){
      avisandoHabilidade = true;
      falar(falasChefe[Math.floor(Math.random()*falasChefe.length)], 1000, ()=>{
        tempoParado = true; somTempo.play();
        $('efeito-tempo').style.display='block';
        setTimeout(()=>{ tempoParado = false; contadorTempo = 0; avisandoHabilidade = false; $('efeito-tempo').style.display='none'; }, 2500);
      });
    }
  }

  // Controles
  if(!tempoParado){
    if((keys.ArrowLeft || keys.KeyA) && player.tx > 10) player.tx -= 0.6 * dt;
    if((keys.ArrowRight || keys.KeyD) && player.tx < 730) player.tx += 0.6 * dt;
    if(keys.Space && player.cooldown <= 0){
        tiros.push({ x: player.x+27, y: player.y, w:6, h:18, s:12 });
        player.cooldown = 200; 
        somTiroPlayer.currentTime = 0; somTiroPlayer.play().catch(()=>{});
    }
  }
  if(player.cooldown > 0) player.cooldown -= dt;

  // Tiros e Colisões
  for(let i=tiros.length-1;i>=0;i--){
    tiros[i].y -= tiros[i].s;
    if(tiros[i].y < -50) tiros.splice(i,1);
    else {
      invasores.forEach(inv => {
        if((inv.vivo || (inv.isBoss && inv.hp > 0) || (inv.isShield && inv.hp > 0)) && colide(tiros[i], inv)){
          if(inv.isShield) { inv.hp -= 50; tiros.splice(i,1); }
          else if(inv.isBoss) { 
              if(!shield) inv.hp -= tiros[i].isFireball ? 150 : 30; 
              if(!tiros[i].isFireball) tiros.splice(i,1);
          } else { 
              inv.vivo = false; player.kills += 0.5; explodir(inv.x, inv.y, '#ff0055'); tiros.splice(i,1);
          }
        }
      });
    }
  }

  if(boss) $('boss-hp-fill').style.width = (boss.hp/boss.maxHp*100) + "%";

  let algumVivo = false;
  invasores.forEach(inv => {
    if(inv.vivo || (inv.isBoss && inv.hp > 0) || (inv.isShield && inv.hp > 0)){
      algumVivo = true;
      if(!inv.isBoss && !inv.isShield && !tempoParado) {
          inv.x += inv.vel * inv.dir;
          if(inv.x > 750 || inv.x < 10) { inv.dir *= -1; inv.y += 10; }
      }
      if(inv.isBoss) desenharBoss(inv);
      else if(inv.isShield) {
          if(boss) { inv.x = boss.x - (inv.w - boss.w)/2; inv.y = boss.y - (inv.h - boss.h)/2; }
          desenharEscudoBoss(inv);
      }
      else desenharNave(inv, '#ff0055', false);
    }
  });

  if(!algumVivo) { faseAtual++; criarFase(); }

  particulas.forEach((p,i)=>{
      p.x += p.vx; p.y += p.vy; p.life--;
      if(p.life <= 0) particulas.splice(i,1);
      else { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); }
  });

  requestAnimationFrame(gameLoop);
}

function desenharNave(obj, color, isPlayer){
    ctx.save();
    if(isPlayer && player.danoTime > 0) ctx.globalAlpha = 0.5;
    const img = isPlayer ? skins.player : skins.alien;
    if(img.complete) ctx.drawImage(img, obj.x, obj.y, obj.w, obj.h);
    else { ctx.fillStyle = color; ctx.fillRect(obj.x, obj.y, obj.w, obj.h); }
    if(isPlayer && player.escudoAtivo) {
        ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 3;
        ctx.strokeRect(obj.x-5, obj.y-5, obj.w+10, obj.h+10);
    }
    ctx.restore();
}

function desenharBoss(obj){
    ctx.save();
    const img = obj.tipo === 2 ? skins.chefe2 : skins.chefe;
    if(img.complete) ctx.drawImage(img, obj.x, obj.y, obj.w, obj.h);
    ctx.restore();
}

function desenharEscudoBoss(obj){
    ctx.save(); ctx.globalAlpha = 0.3;
    if(skins.escudo.complete) ctx.drawImage(skins.escudo, obj.x, obj.y, obj.w, obj.h);
    ctx.restore();
}

function explodir(x,y,color){
    for(let i=0; i<10; i++) particulas.push({ x, y, vx:Math.random()*4-2, vy:Math.random()*4-2, life:25, color });
}

function colide(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

requestAnimationFrame(gameLoop);
