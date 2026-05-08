// Utilitários e Inicialização
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

// Carregamento de Skins
const skins = {
    player: new Image(), amigo: new Image(), alien: new Image(),
    chefe: new Image(), chefe2: new Image(), fireball: new Image(), escudo: new Image(),
    criador: new Image(),
};
skins.player.src = 'jogadorprincipal.png';
skins.amigo.src = 'amigo.png';
skins.alien.src = 'alien.png';
skins.chefe.src = 'chefe1.png';
skins.chefe2.src = 'chefe2.png';
skins.fireball.src = 'bola-defogo.png';
skins.escudo.src = 'escudo.png';
skins.criador.src = 'criador.png';

// Sons
const somMenu = new Audio('menu.mp3');
const somTempo = new Audio('tempo.mp3');
const somTiroPlayer = new Audio('nave1.mp3');
const somTiroInimigo = new Audio('nave2.mp3');

somMenu.loop = true;
somMenu.volume = 0.5;
somTempo.volume = 0.4;
somTiroPlayer.volume = 0.3;
somTiroInimigo.volume = 0.2;

// Variáveis de Estado
let modo = 'menu';
let faseAtual = 1;
let tempoParado = false;
let contadorTempo = 0;
let lastTime = performance.now();
let avisandoHabilidade = false;
let bossMorrendo = false;

const player = { 
    x:370, y:520, w:60, h:60, tx:370, vidas:3, 
    danoTime:0, kills:0, cooldown:0, 
    escudoAtivo: false, escudoTimer: 0 
};
const amigo = { x:-150, y:450, w:60, h:60, tx:-150 };

let invasores = [];
let tiros = [];
let tirosE = [];
let particulas = [];
const keys = {};
let frameAnim = 0;
const falasChefe = ["ZA WARUDO!", "O tempo é meu!", "Você não pode se mexer!", "Inútil! Inútil! Inútil!"];

// Funções Globais (Chamadas pelo HTML)
window.permitirAudio = function() {
    $('overlay-start').style.display = 'none';
    $('menu-principal').style.display = 'block';
    somMenu.play().catch(error => console.error("Erro ao tocar som.", error));
    [somTempo, somTiroPlayer, somTiroInimigo].forEach(s => {
        s.play(); s.pause(); s.currentTime = 0;
    });
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

// Lógica de Jogo
function falar(texto, tempo, cb){
  const box = $('dialogo-box');
  box.innerText = texto;
  box.classList.add('show');
  setTimeout(()=>{ box.classList.remove('show'); cb && cb(); }, tempo);
}

function criarFase(){
  invasores=[]; tiros=[]; tirosE=[]; particulas=[]; avisandoHabilidade = false; bossMorrendo = false;
  player.escudoAtivo = false; player.escudoTimer = 0;
  const bossBar = $('boss-hp-bar'), bossLabel = $('boss-hp-label'), container = $('game-container');
  bossBar.style.display='none'; bossLabel.style.display='none';
  container.classList.remove('shake');
    
  // 1. CHEFE CRIADOR (Fase 15, 30, 45...)
  if(faseAtual % 15 === 0){
    bossBar.style.display='block'; bossLabel.style.display='block';
    bossLabel.innerText = "O CRIADOR DE MUNDOS";
    $('boss-hp-fill').style.width='100%';
    const bossHp = 6000 + faseAtual*250;
    invasores.push({ 
        x:300, y:80, w:200, h:160, 
        hp:bossHp, maxHp:bossHp, 
        isBoss:true, tipo:3, 
        dir:1, vel:1.5,
        timerInvocacao: 0,
        usouCura: false // Controla a habilidade única de reviver do criador
    });
    contadorTempo=0;
  } 
  // 2. CHEFE MK-II (Fase 10, 20, 40...)
  else if(faseAtual % 10 === 0){
    bossBar.style.display='block'; bossLabel.style.display='block';
    bossLabel.innerText = "MK-II: O ANULADOR";
    $('boss-hp-fill').style.width='100%';
    invasores.push({ x:300, y:80, w:180, h:150, hp:8000, maxHp:8000, isBoss:true, tipo:2, dir:1, vel:2.8 });
    invasores.push({ x:260, y:60, w:250, h:190, hp:600, maxHp:600, isShield:true });
  } 
  // 3. CHEFE SUPREMO (Fase 5, 25, 35...)
  else if(faseAtual % 5 === 0){
    bossBar.style.display='block'; bossLabel.style.display='block';
    bossLabel.innerText = "CHEFE SUPREMO";
    $('boss-hp-fill').style.width='100%';
    const bossHp = 5000 + faseAtual*200;
    invasores.push({ x:300, y:80, w:200, h:160, hp:bossHp, maxHp:bossHp, isBoss:true, tipo:1, dir:1, vel:1.4 });
    const shieldHp = 400 + faseAtual*20;
    invasores.push({ x:260, y:60, w:280, h:200, hp:shieldHp, maxHp:shieldHp, isShield:true });
    for(let i=0;i<4;i++) invasores.push({ x:120 + i*170, y:330, w:55, h:55, vivo:true, dir:1, vel:1.2 });
    contadorTempo=0;
  } 
  // 4. FASE NORMAL
  else {
    const cols = 5;
    const rows = 2 + Math.min(2, Math.floor(faseAtual/3));
    for(let r=0;r<rows;r++) {
      for(let c=0;c<cols;c++) {
        invasores.push({ x: c*110 + 130, y: r*70 + 70, w:55, h:55, vivo:true, dir:1, vel: 0.8 + faseAtual*0.15 });
      }
    }
  }
}

// Controles e Habilidades
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if(!tempoParado && modo==='jogando' && !bossMorrendo) {
      if(e.code === 'KeyE') { if(player.kills >= 3){ tiros.push({ x: player.x + player.w/2 - 25, y: player.y - 20, w:50, h:50, s:9, isFireball:true }); player.kills -= 3; } }
      if(e.code === 'KeyR') { if(player.kills >= 2 && !player.escudoAtivo){ player.escudoAtivo = true; player.escudoTimer = 2000; player.kills -= 2; } }
  }
  if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Renderização
function explodir(x,y,color){
  for(let i=0;i<14;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 1 + Math.random()*3;
    particulas.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:30, color });
  }
}

function desenharNave(obj, color, isPlayer){
  ctx.save();
  const cx = obj.x + obj.w/2, cy = obj.y + obj.h/2;
  const flutua = Math.sin(frameAnim*0.08 + obj.x*0.05) * 3;
  ctx.translate(cx, cy + flutua);
  if(!isPlayer && obj.dir) ctx.rotate(obj.dir * 0.1);
  if(isPlayer && player.danoTime > 0 && Math.floor(player.danoTime/4)%2) ctx.globalAlpha = 0.4;
  const img = isPlayer ? skins.player : (obj.x === amigo.x ? skins.amigo : skins.alien);
  if (img.complete && img.naturalWidth !== 0) ctx.drawImage(img, -obj.w/2, -obj.h/2, obj.w, obj.h);
  else {
      ctx.fillStyle = color;
      if(isPlayer){ ctx.beginPath(); ctx.moveTo(0, -obj.h/2); ctx.lineTo(obj.w/2, obj.h/2); ctx.lineTo(0, obj.h/3); ctx.lineTo(-obj.w/2, obj.h/2); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.ellipse(0,0,obj.w/2,obj.h/2.2,0,0,Math.PI*2); ctx.fill(); }
  }
  if(isPlayer && player.escudoAtivo) {
      ctx.restore(); ctx.save(); ctx.translate(cx, cy + flutua); ctx.rotate(frameAnim * 0.1);
      if (skins.escudo.complete && skins.escudo.naturalWidth !== 0) { ctx.globalAlpha = 0.6 + Math.sin(frameAnim*0.2)*0.2; ctx.drawImage(skins.escudo, -obj.w*0.8, -obj.h*0.8, obj.w*1.6, obj.h*1.6); }
      else { ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0,0, obj.w*0.8, 0, Math.PI*2); ctx.stroke(); }
  }
  ctx.restore();
}

function desenharBoss(obj){
  ctx.save();
  const cx = obj.x + obj.w/2, cy = obj.y + obj.h/2;
  ctx.translate(cx, cy + Math.sin(frameAnim*0.05) * 6);
  if(bossMorrendo) ctx.filter = `hue-rotate(${frameAnim*15}deg) brightness(2)`;
  
  let img = skins.chefe;
  if(obj.tipo === 2) img = skins.chefe2;
  if(obj.tipo === 3) {
      img = skins.criador;
      // FILTRO PARA ELIMINAR O FUNDO BRANCO DO CRIADOR:
      // Se a imagem estiver carregada, misturamos a cor branca de fundo do sprite com a tela usando 'multiply'
      if (img.complete && img.naturalWidth !== 0) {
          ctx.globalCompositeOperation = 'multiply';
      }
  } 

  if (img.complete && img.naturalWidth !== 0) {
      ctx.drawImage(img, -obj.w/2, -obj.h/2, obj.w, obj.h);
  } else { 
      ctx.fillStyle = (obj.tipo === 3) ? '#00d2ff' : ((obj.tipo === 2) ? '#444' : '#8b0030'); 
      ctx.beginPath(); ctx.ellipse(0,0,obj.w/2,obj.h/2,0,0,Math.PI*2); ctx.fill(); 
  }
  ctx.restore();
  
  // Reseta o modo de mistura do canvas após desenhar
  ctx.globalCompositeOperation = 'source-over';
}

function desenharEscudoBoss(obj){
  ctx.save(); ctx.translate(obj.x + obj.w/2, obj.y + obj.h/2);
  if (skins.escudo.complete && skins.escudo.naturalWidth !== 0) { ctx.globalAlpha = 0.5 + Math.sin(frameAnim*0.1)*0.2; ctx.drawImage(skins.escudo, -obj.w/2, -obj.h/2, obj.w, obj.h); }
  else { ctx.globalAlpha = 0.35; ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0,0,obj.w/2,obj.h/2,0,0,Math.PI*2); ctx.stroke(); }
  ctx.restore();
}

function desenharFireball(t){
  ctx.save(); 
  const w = t.w || 50;
  const h = t.h || 50;
  ctx.translate(t.x + w/2, t.y + h/2); 
  ctx.rotate(frameAnim*0.3);
  if (skins.fireball.complete && skins.fireball.naturalWidth !== 0) {
      ctx.drawImage(skins.fireball, -w/2, -h/2, w, h);
  } else { 
      ctx.fillStyle = '#ffae3b'; 
      ctx.beginPath(); 
      ctx.arc(0, 0, w/2, 0, Math.PI*2); 
      ctx.fill(); 
  }
  ctx.restore();
}

function colide(a,b){ return a.x < b.x+b.w && a.x+(a.w||6) > b.x && a.y < b.y+b.h && a.y+(a.h||20) > b.y; }

// Game Loop
function gameLoop(now){
  const dt = Math.min(32, now - lastTime);
  lastTime = now; frameAnim += dt * 0.06;
  ctx.clearRect(0,0,800,600);
  if(modo === 'menu') { requestAnimationFrame(gameLoop); return; }

  const lerp = 1 - Math.pow(0.001, dt/1000);
  player.x += (player.tx - player.x) * lerp;
  amigo.x += (amigo.tx - amigo.x) * lerp;
  if(player.danoTime>0) player.danoTime -= dt/16;
  if(player.cooldown>0) player.cooldown -= dt;
  if(player.escudoAtivo){ player.escudoTimer -= dt; if(player.escudoTimer <= 0) player.escudoAtivo = false; }

  if(amigo.x > -100) desenharNave(amigo, '#00d2ff', false);
  desenharNave(player, '#00ff88', true);
  if(modo !== 'jogando'){ requestAnimationFrame(gameLoop); return; }

  $('fase-txt').innerText = faseAtual;
  $('vidas-txt').innerText = player.vidas;
  $('hab-txt').innerText = Math.min(player.kills,3);
  $('escudo-txt').innerText = Math.min(player.kills,2);

  const boss = invasores.find(i=>i.isBoss && i.hp>0);
  const shield = invasores.find(i=>i.isShield && i.hp>0);
  const bossMortoCheck = invasores.find(i=>i.isBoss && i.hp <= 0 && (i.tipo === 2 || i.tipo === 3) && !bossMorrendo);

  if(bossMortoCheck){
      bossMorrendo = true; $('game-container').classList.add('shake');
      
      const nomeBoss = bossMortoCheck.tipo === 3 ? "Criador" : "MK-II";
      const falaMorte = bossMortoCheck.tipo === 3 ? "Criador: Este universo ainda será meu..." : "MK-II: Nos veremos novamente mortal...";
      
      falar(falaMorte, 3500, () => { 
          invasores = invasores.filter(i => !i.isBoss && !i.isBlocoProtetor); // Limpa blocos restantes na vitória
          faseAtual++; 
          criarFase(); 
      });
  }

  // Comportamento do Chefe Supremo (Tipo 1)
  if(boss && boss.tipo === 1 && !tempoParado && !avisandoHabilidade){
    contadorTempo += dt/1000;
    if(contadorTempo >= 7){
      avisandoHabilidade = true;
      falar(falasChefe[Math.floor(Math.random()*falasChefe.length)], 1000, ()=>{
        tempoParado = true; somTempo.currentTime = 0; somTempo.play();
        $('efeito-tempo').style.display='block';
        setTimeout(()=>{ tempoParado = false; contadorTempo = 0; avisandoHabilidade = false; $('efeito-tempo').style.display='none'; }, 2500);
      });
    }
  }

  // Comportamento do MK-II (Tipo 2) - Esquivar-se de disparos
  if(boss && boss.tipo === 2 && !tempoParado && !bossMorrendo){
      tiros.forEach(t => { if(!t.isFireball && Math.abs(t.x - (boss.x + boss.w/2)) < 100 && t.y > boss.y && t.y < boss.y + 450) boss.x += (t.x < boss.x + boss.w/2) ? 6 : -6; });
      if(boss.x < 15) boss.x = 15; if(boss.x > 785 - boss.w) boss.x = 785 - boss.w;
  }

  // NOVA MECÂNICA DO CRIADOR DE MUNDOS (Tipo 3) - Barreiras e Recuperação
  if(boss && boss.tipo === 3 && !tempoParado && !bossMorrendo){
    boss.timerInvocacao += dt;
    
    // 1. Invocação de Barreiras menores a cada 4 segundos
    if(boss.timerInvocacao >= 4000){
      boss.timerInvocacao = 0;
      const blocosAtivos = invasores.filter(i => i.isBlocoProtetor).length;
      
      // Se não houver muitas barreiras na tela, ele invoca 3 pequenos blocos protetores logo abaixo dele
      if(blocosAtivos < 4){
        for(let i=0; i<3; i++){
          invasores.push({
            x: boss.x + 15 + (i * 65),
            y: boss.y + boss.h + 20,
            w: 45,
            h: 25,
            hp: 150, // HP do Bloco (3 tiros normais)
            isBlocoProtetor: true,
            vivo: true
          });
          explodir(boss.x + 35 + (i * 65), boss.y + boss.h + 30, '#00f6ff');
        }
      }
    }

    // 2. Barreira Gigante e Cura de Emergência (Gera uma vez só, quando o HP cai abaixo de 20%)
    if(boss.hp < (boss.maxHp * 0.20) && !boss.usouCura) {
      boss.usouCura = true;
      boss.hp += boss.maxHp * 0.50; // Recupera 50% da vida total
      if(boss.hp > boss.maxHp) boss.hp = boss.maxHp;

      falar("Criador: BARREIRA SUPREMA! Sinta a minha barreira indestrutível!", 3000);
      $('game-container').classList.add('shake');
      setTimeout(() => { $('game-container').classList.remove('shake'); }, 1000);

      // Invoca uma barreira gigante bem no meio do cenário
      invasores.push({
        x: 100,
        y: 300,
        w: 600, // Gigante! Ocupa quase a largura do canvas
        h: 40,
        hp: 900, // Muita vida para o jogador ter que martelar
        isBlocoProtetor: true,
        vivo: true
      });

      // Efeito estético de explosão para spawnar a mega barreira
      for(let xB = 100; xB <= 700; xB += 60) {
        explodir(xB, 320, '#00ffaa');
      }
    }
  }

  // Movimento e tiro do jogador
  if(!tempoParado && !bossMorrendo){
    const speed = 0.5 * dt;
    if((keys['ArrowLeft'] || keys['KeyA']) && player.tx > 10) player.tx -= speed;
    if((keys['ArrowRight'] || keys['KeyD']) && player.tx < 740-player.w+10) player.tx += speed;
    if(keys['Space'] && player.cooldown <= 0){
      tiros.push({ x: player.x + player.w/2 - 3, y: player.y, w:6, h:18, s:11 });
      player.cooldown = 220; somTiroPlayer.currentTime = 0; somTiroPlayer.play();
    }
  }

  // Atualização dos Tiros do Player
  for(let i=tiros.length-1;i>=0;i--){ tiros[i].y -= tiros[i].s * (dt/16); if(tiros[i].y < -100) tiros.splice(i,1); }

  // Atualização dos Invasores
  let vivos = 0; let edge = false;
  invasores.forEach(inv=>{
    if(inv.isBoss ? inv.hp<=0 : (inv.isShield ? inv.hp<=0 : (inv.isBlocoProtetor ? inv.hp<=0 : !inv.vivo))) return;
    if(!inv.isShield && !inv.isBlocoProtetor) vivos++; // Blocos e Escudos não contam como "invasores vivos" para passar de fase
    if((inv.isBoss || inv.isShield || !tempoParado) && !bossMorrendo && !inv.isBlocoProtetor){
       if(inv.isShield && boss){ inv.x = boss.x + boss.w/2 - inv.w/2; inv.y = boss.y + boss.h/2 - inv.h/2; }
       else {
         inv.x += inv.vel * inv.dir * (dt/16); if(inv.x > 800 - inv.w - 10 || inv.x < 10) edge = true;
         if(Math.random() < (inv.isBoss ? 0.025 : 0.005) * (dt/16)) { tirosE.push({ x: inv.x + inv.w/2 - 2, y: inv.y + inv.h }); somTiroInimigo.currentTime = 0; somTiroInimigo.play(); }
       }
    }
  });

  if(edge && !bossMorrendo){ invasores.forEach(e=>{ if(!e.isShield && !e.isBlocoProtetor){ e.dir *= -1; if(e.x < 10) e.x = 11; if(e.x > 800 - e.w - 10) e.x = 800 - e.w - 11; if(!e.isBoss && !tempoParado) e.y += 12; } }); }

  // Atualização dos Tiros Inimigos
  for(let i=tirosE.length-1;i>=0;i--){
    const te = tirosE[i]; te.y += 5 * (dt/16);
    if(colide({x:te.x, y:te.y, w:5, h:15}, player)){
        if(player.escudoAtivo) { explodir(te.x, te.y, '#00d2ff'); tirosE.splice(i,1); }
        else if(player.danoTime <= 0) { player.vidas--; player.danoTime = 60; tirosE.splice(i,1); explodir(player.x+player.w/2, player.y+player.h/2, '#00ff88'); if(player.vidas <= 0){ modo = 'gameover'; $('fase-final').innerText = faseAtual; $('game-over').classList.add('show'); } }
    } else if(te.y > 620) tirosE.splice(i,1);
  }

  // Colisões e Dano
  if(!tempoParado && !bossMorrendo){
    for(let ti=tiros.length-1; ti>=0; ti--){
      const t = tiros[ti]; let consumed = false;
      for(const inv of invasores){
        const alive = inv.isBoss ? inv.hp>0 : (inv.isShield ? inv.hp>0 : (inv.isBlocoProtetor ? inv.hp>0 : inv.vivo));
        if(!alive || !colide(t, inv)) continue;
        if(t.isFireball){
          if(inv.isBoss && inv.tipo === 2) { 
              explodir(t.x, t.y, '#666'); 
              tiros.splice(ti,1); 
              consumed = true; 
              break; 
          }
          if(inv.isBoss || inv.isShield || inv.isBlocoProtetor){ 
              inv.hp -= 40; 
              explodir(t.x+(t.w||50)/2, t.y+(t.h||50)/2, inv.isBoss ? '#ff0055' : '#00d2ff'); 
          } else { 
              inv.vivo = false; 
              player.kills++; 
              explodir(inv.x+inv.w/2, inv.y+inv.h/2, '#ff0055'); 
          }
          tiros.splice(ti,1); // Bola de fogo some ao colidir
          consumed = true;
          break;
        } else {
          if(inv.isShield) { inv.hp -= 50; consumed = true; }
          else if(inv.isBlocoProtetor) { inv.hp -= 50; consumed = true; } // Tiro comum dá 50 de dano nas barreiras
          else if(inv.isBoss) { 
              if(inv.tipo === 3 || !(shield && shield.hp > 0)) {
                  inv.hp -= 50; 
              }
              consumed = true; 
          }
          else { inv.vivo = false; player.kills++; consumed = true; }
          if(consumed) { explodir(t.x, t.y, '#fff'); tiros.splice(ti,1); break; }
        }
      }
    }
  }

  if(boss) $('boss-hp-fill').style.width = Math.max(0,(boss.hp/boss.maxHp)*100)+'%';
  if(vivos === 0 && !bossMorrendo){ faseAtual++; criarFase(); }

  // Desenho dos Invasores, Blocos e Efeitos
  invasores.forEach(inv=>{ 
      if(inv.isBoss){ 
          if(inv.hp>0 || ((inv.tipo === 2 || inv.tipo === 3) && bossMorrendo)) desenharBoss(inv); 
      } else if(inv.isShield){ 
          if(inv.hp>0) desenharEscudoBoss(inv); 
      } else if(inv.isBlocoProtetor){
          if(inv.hp>0) {
              // Estilo visual neon tecnológico para as barreiras protetoras
              ctx.save();
              ctx.fillStyle = '#00f6ff';
              ctx.shadowColor = '#00f6ff';
              ctx.shadowBlur = 8;
              ctx.fillRect(inv.x, inv.y, inv.w, inv.h);
              ctx.shadowBlur = 0;
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.strokeRect(inv.x + 3, inv.y + 3, inv.w - 6, inv.h - 6);
              ctx.restore();
          }
      } else if(inv.vivo) {
          desenharNave(inv, '#ff0055', false); 
      }
  });

  tiros.forEach(t=> t.isFireball ? desenharFireball(t) : (ctx.fillStyle='#fff', ctx.fillRect(t.x, t.y, t.w, t.h)));
  tirosE.forEach(te=>(ctx.fillStyle='#ff0055', ctx.fillRect(te.x, te.y, 5, 15)));
  particulas.forEach((p,i)=>{ p.x += p.vx * (dt/16); p.y += p.vy * (dt/16); p.life -= dt/16; if(p.life<=0) particulas.splice(i,1); else { ctx.globalAlpha = p.life/30; ctx.fillStyle = p.color; ctx.fillRect(p.x-2,p.y-2,4,4); ctx.globalAlpha = 1; } });
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
