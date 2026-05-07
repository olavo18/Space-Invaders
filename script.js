const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

const skins = {
    player: new Image(),
    amigo: new Image(),
    alien: new Image(),
    chefe: new Image(),
    chefe2: new Image(),
    fireball: new Image(),
    escudo: new Image()
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

somMenu.loop = true;
somMenu.volume = 0.5;
somTempo.volume = 0.4;
somTiroPlayer.volume = 0.3;
somTiroInimigo.volume = 0.2;

function permitirAudio() {
    document.getElementById('overlay-start').style.display = 'none';
    document.getElementById('menu-principal').style.display = 'block';
    somMenu.play().then(() => {
        console.log("Áudio menu.mp3 liberado!");
    }).catch(error => {
        console.error("Erro ao tocar som.", error);
    });
    [somTempo, somTiroPlayer, somTiroInimigo].forEach(s => {
        s.play(); s.pause(); s.currentTime = 0;
    });
}

let modo = 'menu';
let faseAtual = 1;
let tempoParado = false;
let contadorTempo = 0;
let lastTime = performance.now();
let avisandoHabilidade = false;
let bossMorrendo = false;

const player = { 
    x: 370, y: 520, w: 60, h: 60, tx: 370, 
    vidas: 3, danoTime: 0, kills: 0, 
    cooldown: 0, escudoAtivo: false, escudoTimer: 0 
};

const amigo = { x: -150, y: 450, w: 60, h: 60, tx: -150 };

let invasores = [];
let tiros = [];
let tirosE = [];
let particulas = [];
const keys = {};
let frameAnim = 0;
const falasChefe = ["ZA WARUDO!", "O tempo é meu!", "Você não pode se mexer!", "Inútil! Inútil! Inútil!"];

function falar(texto, tempo, cb) {
    const box = document.getElementById('dialogo-box');
    box.innerText = texto;
    box.classList.add('show');
    setTimeout(() => {
        box.classList.remove('show');
        if (cb) cb();
    }, tempo);
}

function iniciarHistoria() {
    somMenu.pause();
    document.getElementById('menu-principal').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    modo = 'historia';
    amigo.tx = 200;
    player.tx = 500;
    falar("Hunter: Eu consigo derrotar esses alienígenas sozinho!", 2200, () => {
        falar("Amigo: Hunter, você enlouqueceu? São muitos!", 2200, () => {
            falar("Hunter: Vou mostrar do que sou capaz!", 1500, () => {
                modo = 'jogando';
                amigo.tx = -200;
                player.tx = 370;
                criarFase();
            });
        });
    });
}

function criarFase() {
    invasores = []; tiros = []; tirosE = []; particulas = [];
    avisandoHabilidade = false; bossMorrendo = false;
    player.escudoAtivo = false; player.escudoTimer = 0;
    
    const bossBar = document.getElementById('boss-hp-bar');
    const bossLabel = document.getElementById('boss-hp-label');
    const container = document.getElementById('game-container');
    
    bossBar.style.display = 'none';
    bossLabel.style.display = 'none';
    container.classList.remove('shake');

    if (faseAtual % 10 === 0) {
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "MK-II: O ANULADOR";
        document.getElementById('boss-hp-fill').style.width = '100%';
        // Boss 2: 3000 HP, Velocidade aumentada para garantir movimento
        invasores.push({ x: 300, y: 80, w: 180, h: 150, hp: 3000, maxHp: 3000, isBoss: true, tipo: 2, dir: 1, vel: 2.8 });
        invasores.push({ x: 260, y: 60, w: 250, h: 190, hp: 600, maxHp: 600, isShield: true });
    } 
    else if (faseAtual % 5 === 0) {
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "CHEFE SUPREMO";
        document.getElementById('boss-hp-fill').style.width = '100%';
        const bossHp = 5000 + faseAtual * 200;
        invasores.push({ x: 300, y: 80, w: 200, h: 160, hp: bossHp, maxHp: bossHp, isBoss: true, tipo: 1, dir: 1, vel: 1.4 });
        const shieldHp = 400 + faseAtual * 20;
        invasores.push({ x: 260, y: 60, w: 280, h: 200, hp: shieldHp, maxHp: shieldHp, isShield: true });
        for (let i = 0; i < 4; i++) {
            invasores.push({ x: 120 + i * 170, y: 330, w: 55, h: 55, vivo: true, dir: 1, vel: 1.2 });
        }
        contadorTempo = 0;
    } else {
        const rows = 2 + Math.min(2, Math.floor(faseAtual / 3));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < 5; c++) {
                invasores.push({ x: c * 110 + 130, y: r * 70 + 70, w: 55, h: 55, vivo: true, dir: 1, vel: 0.8 + faseAtual * 0.15 });
            }
        }
    }
}

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!tempoParado && modo === 'jogando' && !bossMorrendo) {
        if (e.code === 'KeyE' && player.kills >= 3) {
            tiros.push({ x: player.x + player.w / 2 - 25, y: player.y - 20, w: 50, h: 50, s: 9, isFireball: true });
            player.kills -= 3;
        }
        if (e.code === 'KeyR' && player.kills >= 2 && !player.escudoAtivo) {
            player.escudoAtivo = true;
            player.escudoTimer = 2000;
            player.kills -= 2;
        }
    }
});

window.addEventListener('keyup', e => { keys[e.code] = false; });

function explodir(x, y, color) {
    for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 3;
        particulas.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 30, color });
    }
}

function colide(a, b) {
    return a.x < b.x + b.w && a.x + (a.w || 6) > b.x && a.y < b.y + b.h && a.y + (a.h || 20) > b.y;
}

function desenharNave(obj, color, isPlayer) {
    ctx.save();
    const cx = obj.x + obj.w / 2, cy = obj.y + obj.h / 2;
    const flutua = Math.sin(frameAnim * 0.08 + obj.x * 0.05) * 3;
    ctx.translate(cx, cy + flutua);
    if (!isPlayer && obj.dir) ctx.rotate(obj.dir * 0.1);
    if (isPlayer && player.danoTime > 0 && Math.floor(player.danoTime / 4) % 2) ctx.globalAlpha = 0.4;
    const img = isPlayer ? skins.player : (obj.x === amigo.x ? skins.amigo : skins.alien);
    if (img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, -obj.w / 2, -obj.h / 2, obj.w, obj.h);
    } else {
        ctx.fillStyle = color;
        if (isPlayer) {
            ctx.beginPath();
            ctx.moveTo(0, -obj.h / 2); ctx.lineTo(obj.w / 2, obj.h / 2); 
            ctx.lineTo(0, obj.h / 3); ctx.lineTo(-obj.w / 2, obj.h / 2); ctx.closePath(); ctx.fill();
        } else {
            ctx.beginPath(); ctx.ellipse(0, 0, obj.w / 2, obj.h / 2.2, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
    if (isPlayer && player.escudoAtivo) {
        ctx.restore(); ctx.save(); ctx.translate(cx, cy + flutua); ctx.rotate(frameAnim * 0.1);
        if (skins.escudo.complete) {
            ctx.globalAlpha = 0.6; ctx.drawImage(skins.escudo, -obj.w * 0.8, -obj.h * 0.8, obj.w * 1.6, obj.h * 1.6);
        } else {
            ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, obj.w * 0.8, 0, Math.PI * 2); ctx.stroke();
        }
    }
    ctx.restore();
}

function desenharBoss(obj) {
    ctx.save();
    ctx.translate(obj.x + obj.w / 2, obj.y + obj.h / 2 + Math.sin(frameAnim * 0.05) * 6);
    if (bossMorrendo) ctx.filter = `hue-rotate(${frameAnim * 15}deg) brightness(2)`;
    const img = (obj.tipo === 2) ? skins.chefe2 : skins.chefe;
    if (img.complete) ctx.drawImage(img, -obj.w / 2, -obj.h / 2, obj.w, obj.h);
    ctx.restore();
}

function desenharEscudoBoss(obj) {
    ctx.save();
    ctx.translate(obj.x + obj.w / 2, obj.y + obj.h / 2);
    if (skins.escudo.complete) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(skins.escudo, -obj.w / 2, -obj.h / 2, obj.w, obj.h);
    }
    ctx.restore();
}

function desenharFireball(t) {
    ctx.save();
    ctx.translate(t.x + t.w / 2, t.y + t.h / 2);
    ctx.rotate(frameAnim * 0.3);
    if (skins.fireball.complete) ctx.drawImage(skins.fireball, -t.w / 2, -t.h / 2, t.w, t.h);
    else { ctx.fillStyle = '#ffa'; ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h); }
    ctx.restore();
}

function gameLoop(now) {
    const dt = Math.min(32, now - lastTime);
    lastTime = now; frameAnim += dt * 0.06;
    ctx.clearRect(0, 0, 800, 600);
    if (modo === 'menu') { requestAnimationFrame(gameLoop); return; }

    const lerp = 1 - Math.pow(0.001, dt / 1000);
    player.x += (player.tx - player.x) * lerp;
    amigo.x += (amigo.tx - amigo.x) * lerp;

    if (player.danoTime > 0) player.danoTime -= dt / 16;
    if (player.cooldown > 0) player.cooldown -= dt;
    if (player.escudoAtivo) {
        player.escudoTimer -= dt;
        if (player.escudoTimer <= 0) player.escudoAtivo = false;
    }

    if (amigo.x > -100) desenharNave(amigo, '#00d2ff', false);
    desenharNave(player, '#00ff88', true);
    if (modo !== 'jogando') { requestAnimationFrame(gameLoop); return; }

    document.getElementById('fase-txt').innerText = faseAtual;
    document.getElementById('vidas-txt').innerText = player.vidas;
    document.getElementById('hab-txt').innerText = Math.min(player.kills, 3);
    document.getElementById('escudo-txt').innerText = Math.min(player.kills, 2);

    const boss = invasores.find(i => i.isBoss && i.hp > 0);
    const shield = invasores.find(i => i.isShield && i.hp > 0);

    // --- LOGICA BOSS 1: SUPREMO ---
    if (boss && boss.tipo === 1 && !tempoParado && !avisandoHabilidade) {
        boss.x += boss.vel * boss.dir * (dt / 16);
        if (boss.x > 780 - boss.w || boss.x < 20) boss.dir *= -1;
        if (Math.random() < 0.02 * (dt / 16)) {
            tirosE.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h });
            somTiroInimigo.currentTime = 0; somTiroInimigo.play();
        }
        contadorTempo += dt / 1000;
        if (contadorTempo >= 7) {
            avisandoHabilidade = true;
            falar(falasChefe[Math.floor(Math.random() * 4)], 1000, () => {
                tempoParado = true; somTempo.play();
                document.getElementById('efeito-tempo').style.display = 'block';
                setTimeout(() => {
                    tempoParado = false; contadorTempo = 0;
                    avisandoHabilidade = false;
                    document.getElementById('efeito-tempo').style.display = 'none';
                }, 2500);
            });
        }
    }

    // --- LOGICA BOSS 2: MK-II (MOVIMENTO, ESQUIVA E TIRO) ---
    if (boss && boss.tipo === 2 && !tempoParado && !bossMorrendo) {
        boss.x += boss.vel * boss.dir * (dt / 16);
        tiros.forEach(t => {
            if (!t.isFireball && Math.abs(t.x - (boss.x + boss.w / 2)) < 110 && t.y > boss.y) {
                boss.x += (t.x < boss.x + boss.w / 2) ? 7 : -7;
            }
        });
        if (boss.x < 15 || boss.x > 785 - boss.w) boss.dir *= -1;
        if (Math.random() < 0.03 * (dt / 16)) {
            tirosE.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h });
            somTiroInimigo.currentTime = 0; somTiroInimigo.play();
        }
    }

    // Movimento Player
    const pSpeed = 0.5 * dt;
    if (!tempoParado && !bossMorrendo) {
        if ((keys['ArrowLeft'] || keys['KeyA']) && player.tx > 10) player.tx -= pSpeed;
        if ((keys['ArrowRight'] || keys['KeyD']) && player.tx < 740) player.tx += pSpeed;
        if (keys['Space'] && player.cooldown <= 0) {
            tiros.push({ x: player.x + 27, y: player.y, w: 6, h: 18, s: 11 });
            player.cooldown = 220; somTiroPlayer.currentTime = 0; somTiroPlayer.play();
        }
    }

    for (let i = tiros.length - 1; i >= 0; i--) {
        tiros[i].y -= tiros[i].s * (dt / 16);
        if (tiros[i].y < -100) tiros.splice(i, 1);
    }

    let vivos = 0, edge = false;
    invasores.forEach(inv => {
        if (inv.isBoss ? inv.hp <= 0 : (inv.isShield ? inv.hp <= 0 : !inv.vivo)) return;
        if (!inv.isShield) vivos++;
        if (inv.isShield && boss) {
            inv.x = boss.x + boss.w / 2 - inv.w / 2;
            inv.y = boss.y + boss.h / 2 - inv.h / 2;
        } else if (!inv.isBoss && !tempoParado) {
            inv.x += inv.vel * inv.dir * (dt / 16);
            if (inv.x > 750 || inv.x < 10) edge = true;
            if (Math.random() < 0.005 * (dt / 16)) {
                tirosE.push({ x: inv.x + inv.w / 2, y: inv.y + inv.h });
            }
        }
    });

    if (edge) {
        invasores.forEach(e => { if (!e.isBoss && !e.isShield) { e.dir *= -1; e.y += 12; } });
    }

    for (let i = tirosE.length - 1; i >= 0; i--) {
        tirosE[i].y += 5 * (dt / 16);
        if (colide(tirosE[i], player)) {
            if (!player.escudoAtivo && player.danoTime <= 0) {
                player.vidas--; player.danoTime = 60;
                if (player.vidas <= 0) { 
                    modo = 'gameover'; 
                    document.getElementById('game-over').classList.add('show'); 
                }
            }
            tirosE.splice(i, 1);
        } else if (tirosE[i].y > 620) tirosE.splice(i, 1);
    }

    for (let ti = tiros.length - 1; ti >= 0; ti--) {
        for (let inv of invasores) {
            const alive = inv.isBoss ? inv.hp > 0 : (inv.isShield ? inv.hp > 0 : inv.vivo);
            if (alive && colide(tiros[ti], inv)) {
                if (inv.isShield) inv.hp -= 50;
                else if (inv.isBoss) {
                    if (!shield) inv.hp -= tiros[ti].isFireball ? 150 : 50;
                } else {
                    inv.vivo = false; player.kills++; explodir(inv.x, inv.y, '#f05');
                }
                if (!tiros[ti].isFireball) { tiros.splice(ti, 1); break; }
            }
        }
    }

    if (boss) document.getElementById('boss-hp-fill').style.width = (boss.hp / boss.maxHp) * 100 + '%';
    if (vivos === 0 && !bossMorrendo) { faseAtual++; criarFase(); }

    particulas.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particulas.splice(i, 1);
        else { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); }
    });

    invasores.forEach(inv => {
        if (inv.isBoss) desenharBoss(inv);
        else if (inv.isShield && inv.hp > 0) desenharEscudoBoss(inv);
        else if (inv.vivo) desenharNave(inv, '#ff0055', false);
    });

    tiros.forEach(t => {
        if (t.isFireball) desenharFireball(t);
        else { ctx.fillStyle = '#fff'; ctx.fillRect(t.x, t.y, t.w, t.h); }
    });

    tirosE.forEach(te => { ctx.fillStyle = '#f00'; ctx.fillRect(te.x, te.y, 5, 15); });

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
