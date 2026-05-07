const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- ASSETS ---
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
const somTiroPlayer = new Audio('nave1.mp3');
const somTiroInimigo = new Audio('nave2.mp3');
somMenu.loop = true;

// --- ESTADO DO JOGO ---
let modo = 'menu';
let faseAtual = 1;
let lastTime = performance.now();
let bossMorrendo = false;
let frameAnim = 0;

const player = { 
    x:370, y:520, w:60, h:60, tx:370, vidas:3, 
    danoTime:0, kills:0, cooldown:0, 
    escudoAtivo: false, escudoTimer: 0 
};

const amigo = { x:-150, y:450, w:60, h:60, tx:-150 };
let invasores = [], tiros = [], tirosE = [], particulas = [];
const keys = {};

const $ = id => document.getElementById(id);

// --- FUNÇÕES DE INTERFACE ---
function permitirAudio() {
    $('overlay-start').style.display = 'none';
    $('menu-principal').style.display = 'block';
    somMenu.play().catch(() => {});
}

function falar(texto, tempo, cb){
    const box = $('dialogo-box');
    box.innerText = texto;
    box.classList.add('show');
    setTimeout(() => { box.classList.remove('show'); if(cb) cb(); }, tempo);
}

function iniciarHistoria(){
    somMenu.pause();
    $('menu-principal').style.display = 'none';
    $('game-container').style.display = 'block';
    modo = 'historia';
    amigo.tx = 200; player.tx = 500;
    
    falar("Hunter: Eu consigo derrotar esses alienígenas sozinho!", 2200, () => {
        falar("Amigo: Hunter, você enlouqueceu? São muitos!", 2200, () => {
            falar("Hunter: Vou mostrar do que sou capaz!", 1500, () => {
                modo = 'jogando';
                amigo.tx = -200; player.tx = 370;
                criarFase();
            });
        });
    });
}

function criarFase(){
    invasores = []; tiros = []; tirosE = []; bossMorrendo = false;
    player.escudoAtivo = false;
    
    const bossBar = $('boss-hp-bar'), bossLabel = $('boss-hp-label'), bossGif = $('boss3-gif');
    bossBar.style.display = 'none'; bossLabel.style.display = 'none'; bossGif.style.display = 'none';
    $('game-container').classList.remove('shake');
    $('ui-camada').classList.remove('glitch-ui');

    if(faseAtual % 15 === 0){ // NOVO BOSS 3
        bossBar.style.display = 'block'; bossLabel.style.display = 'block';
        bossLabel.innerText = "MK-III: ERRO DE SISTEMA";
        invasores.push({ x:300, y:80, w:220, h:220, hp:8000, maxHp:8000, isBoss:true, tipo:3, dir:1, vel:2.8 });
    }
    else if(faseAtual % 10 === 0){ // BOSS 2
        bossBar.style.display = 'block'; bossLabel.style.display = 'block';
        bossLabel.innerText = "MK-II: O ANULADOR";
        invasores.push({ x:300, y:80, w:180, h:150, hp:5000, maxHp:5000, isBoss:true, tipo:2, dir:1, vel:3.2 });
        invasores.push({ x:260, y:60, w:250, h:190, hp:400, maxHp:400, isShield:true });
    }
    else if(faseAtual % 5 === 0){ // BOSS 1
        bossBar.style.display = 'block'; bossLabel.style.display = 'block';
        invasores.push({ x:300, y:80, w:200, h:160, hp:5000, maxHp:5000, isBoss:true, tipo:1, dir:1, vel:1.4 });
    }
    else {
        const rows = 2 + Math.min(2, Math.floor(faseAtual/3));
        for(let r=0; r<rows; r++) {
            for(let c=0; c<5; c++) {
                invasores.push({ x: c*110 + 130, y: r*70 + 70, w:55, h:55, vivo:true, dir:1, vel: 0.8 + faseAtual*0.1 });
            }
        }
    }
}

// --- CONTROLES ---
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if(modo === 'jogando' && !bossMorrendo){
        if(e.code === 'KeyE' && player.kills >= 3) {
            tiros.push({ x: player.x + 5, y: player.y - 20, w:50, h:50, s:9, isFireball:true });
            player.kills -= 3;
        }
        if(e.code === 'KeyR' && player.kills >= 2 && !player.escudoAtivo) {
            player.escudoAtivo = true; player.escudoTimer = 2000; player.kills -= 2;
        }
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

// --- LOOP ---
function gameLoop(now) {
    const dt = Math.min(32, now - lastTime);
    lastTime = now;
    frameAnim += dt * 0.06;
    ctx.clearRect(0,0,800,600);

    if(modo === 'menu') { requestAnimationFrame(gameLoop); return; }

    const lerp = 1 - Math.pow(0.001, dt/1000);
    player.x += (player.tx - player.x) * lerp;
    amigo.x += (amigo.tx - amigo.x) * lerp;

    if(player.danoTime > 0) player.danoTime -= dt/16;
    if(player.cooldown > 0) player.cooldown -= dt;
    if(player.escudoAtivo) {
        player.escudoTimer -= dt;
        if(player.escudoTimer <= 0) player.escudoAtivo = false;
    }

    if(modo === 'jogando') atualizarJogo(dt);
    desenharTudo();
    requestAnimationFrame(gameLoop);
}

function atualizarJogo(dt) {
    $('fase-txt').innerText = faseAtual;
    $('vidas-txt').innerText = player.vidas;
    $('hab-txt').innerText = Math.min(player.kills, 3);
    $('escudo-txt').innerText = Math.min(player.kills, 2);

    const speed = 0.5 * dt;
    if((keys['ArrowLeft'] || keys['KeyA']) && player.tx > 10) player.tx -= speed;
    if((keys['ArrowRight'] || keys['KeyD']) && player.tx < 730) player.tx += speed;

    if(keys['Space'] && player.cooldown <= 0) {
        tiros.push({ x: player.x + 27, y: player.y, w:6, h:18, s:11 });
        player.cooldown = 220;
        somTiroPlayer.currentTime = 0; somTiroPlayer.play();
    }

    // Lógica do Boss e Esquiva
    const boss = invasores.find(inv => inv.isBoss && inv.hp > 0);
    if(boss && boss.tipo === 2) {
        tiros.forEach(t => {
            if(!t.isFireball && Math.abs(t.x - (boss.x + boss.w/2)) < 100) {
                boss.x += (t.x < boss.x + boss.w/2) ? 5 : -5;
            }
        });
    }

    // Boss 3 Visual
    if(boss && boss.tipo === 3) {
        const gif = $('boss3-gif');
        gif.style.display = 'block';
        gif.style.left = (canvas.offsetLeft + boss.x) + "px";
        gif.style.top = (canvas.offsetTop + boss.y) + "px";
        gif.style.width = boss.w + "px";
        if(boss.hp < 4000) $('game-container').classList.add('shake');
        if(boss.hp < 2000) $('ui-camada').classList.add('glitch-ui');
    }

    // Atualizar HP Bar
    if(boss) {
        $('boss-hp-bar').style.display = 'block';
        $('boss-hp-fill').style.width = (boss.hp / boss.maxHp * 100) + '%';
    }

    // Movimento Invasores
    let vivos = 0;
    invasores.forEach(inv => {
        if(inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
        if(!inv.isShield) vivos++;
        inv.x += inv.vel * inv.dir;
        if(inv.x > 750 || inv.x < 10) { 
            invasores.forEach(i => { i.dir *= -1; if(!i.isBoss) i.y += 10; });
        }
        if(Math.random() < 0.01) tirosE.push({ x: inv.x + inv.w/2, y: inv.y + inv.h, s: 5 });
    });

    // Colisões e Tiros
    tiros.forEach((t, ti) => {
        t.y -= t.s;
        invasores.forEach(inv => {
            if(inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
            if(t.x < inv.x + inv.w && t.x + t.w > inv.x && t.y < inv.y + inv.h && t.y + t.h > inv.y) {
                if(inv.isBoss) inv.hp -= (t.isFireball ? 150 : 50);
                else inv.vivo = false;
                if(!t.isFireball) tiros.splice(ti, 1);
            }
        });
    });

    if(vivos === 0) { faseAtual++; criarFase(); }
}

function desenharTudo() {
    if(amigo.x > -100) ctx.drawImage(skins.amigo, amigo.x, amigo.y, amigo.w, amigo.h);
    
    ctx.save();
    if(player.danoTime > 0) ctx.globalAlpha = 0.5;
    ctx.drawImage(skins.player, player.x, player.y, player.w, player.h);
    if(player.escudoAtivo) ctx.drawImage(skins.escudo, player.x-10, player.y-10, 80, 80);
    ctx.restore();

    invasores.forEach(inv => {
        if(inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
        if(inv.isBoss) {
            if(inv.tipo === 1) ctx.drawImage(skins.chefe, inv.x, inv.y, inv.w, inv.h);
            if(inv.tipo === 2) ctx.drawImage(skins.chefe2, inv.x, inv.y, inv.w, inv.h);
            // Tipo 3 é o GIF (HTML), não precisa desenhar no Canvas
        } else {
            ctx.drawImage(skins.alien, inv.x, inv.y, inv.w, inv.h);
        }
    });

    tiros.forEach(t => {
        if(t.isFireball) ctx.drawImage(skins.fireball, t.x, t.y, t.w, t.h);
        else { ctx.fillStyle = "#0ff"; ctx.fillRect(t.x, t.y, t.w, t.h); }
    });

    tirosE.forEach(te => { ctx.fillStyle = "#f05"; ctx.fillRect(te.x, te.y, 4, 12); });
}

requestAnimationFrame(gameLoop);
