const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
const somTiro = new Audio('nave1.mp3');
somMenu.loop = true;

let modo = 'menu', faseAtual = 1, lastTime = performance.now();
const player = { x:370, y:520, w:60, h:60, tx:370, vidas:3, kills:0, cooldown:0, escudoAtivo:false, escudoTimer:0 };
const amigo = { x:-150, y:450, w:60, h:60, tx:-150 };
let invasores = [], tiros = [], tirosE = [];
const keys = {};

function permitirAudio() {
    document.getElementById('overlay-start').style.display = 'none';
    document.getElementById('menu-principal').style.display = 'block';
    somMenu.play().catch(() => {});
}

function falar(texto, tempo, cb) {
    const box = document.getElementById('dialogo-box');
    box.innerText = texto; box.classList.add('show');
    setTimeout(() => { box.classList.remove('show'); if(cb) cb(); }, tempo);
}

function iniciarHistoria() {
    somMenu.pause();
    document.getElementById('menu-principal').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    modo = 'historia'; amigo.tx = 200; player.tx = 500;
    falar("Hunter: Eu cuido deles!", 2000, () => {
        amigo.tx = -200; player.tx = 370; modo = 'jogando'; criarFase();
    });
}

function criarFase() {
    invasores = []; tiros = []; tirosE = [];
    const bossBar = document.getElementById('boss-hp-bar');
    bossBar.style.display = 'none';
    document.getElementById('boss3-gif').style.display = 'none';

    if(faseAtual % 5 === 0) {
        bossBar.style.display = 'block';
        let tipo = (faseAtual % 15 === 0) ? 3 : (faseAtual % 10 === 0 ? 2 : 1);
        if(tipo === 3) document.getElementById('boss3-gif').style.display = 'block';
        invasores.push({ x:300, y:80, w:200, h:160, hp:5000, maxHp:5000, isBoss:true, tipo: tipo, dir:1, vel:2 });
    } else {
        for(let r=0; r<3; r++) {
            for(let c=0; c<6; c++) {
                invasores.push({ x: c*100 + 100, y: r*60 + 60, w:50, h:50, vivo:true, dir:1, vel: 1 + faseAtual*0.2 });
            }
        }
    }
}

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if(modo === 'jogando') {
        if(e.code === 'KeyE' && player.kills >= 3) {
            tiros.push({ x: player.x+5, y: player.y, w:50, h:50, s:8, isFireball:true });
            player.kills -= 3;
        }
        if(e.code === 'KeyR' && player.kills >= 2) {
            player.escudoAtivo = true; player.escudoTimer = 2000; player.kills -= 2;
        }
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

function gameLoop(now) {
    const dt = now - lastTime; lastTime = now;
    ctx.clearRect(0,0,800,600);

    if(modo === 'jogando') {
        const speed = 0.6 * dt;
        if(keys['ArrowLeft'] || keys['KeyA']) player.tx -= speed;
        if(keys['ArrowRight'] || keys['KeyD']) player.tx += speed;
        player.x += (player.tx - player.x) * 0.1;

        if(keys['Space'] && player.cooldown <= 0) {
            tiros.push({ x: player.x+27, y: player.y, w:6, h:18, s:10 });
            player.cooldown = 250; somTiro.play();
        }
        if(player.cooldown > 0) player.cooldown -= dt;
        if(player.escudoTimer > 0) { player.escudoTimer -= dt; } else { player.escudoAtivo = false; }

        // Atualiza UI
        document.getElementById('fase-txt').innerText = faseAtual;
        document.getElementById('vidas-txt').innerText = player.vidas;
        document.getElementById('hab-txt').innerText = Math.floor(player.kills/3);

        // Movimento Inimigos
        let vivos = 0;
        invasores.forEach(inv => {
            if(inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
            vivos++;
            inv.x += inv.vel * inv.dir;
            if(inv.x > 750 || inv.x < 10) { inv.dir *= -1; inv.y += 10; }
            if(inv.isBoss && inv.tipo === 3) {
                const gif = document.getElementById('boss3-gif');
                gif.style.left = (canvas.offsetLeft + inv.x) + "px";
                gif.style.top = (canvas.offsetTop + inv.y) + "px";
            }
        });
        if(vivos === 0) { faseAtual++; criarFase(); }

        // Tiros
        tiros.forEach((t, i) => {
            t.y -= t.s;
            invasores.forEach(inv => {
                if(!inv.vivo && !inv.isBoss) return;
                if(t.x < inv.x + inv.w && t.x + t.w > inv.x && t.y < inv.y + inv.h) {
                    if(inv.isBoss) { inv.hp -= (t.isFireball?200:50); document.getElementById('boss-hp-fill').style.width = (inv.hp/inv.maxHp*100)+'%'; }
                    else { inv.vivo = false; player.kills++; }
                    if(!t.isFireball) tiros.splice(i, 1);
                }
            });
        });
    }

    // Desenho
    ctx.drawImage(skins.player, player.x, player.y, player.w, player.h);
    if(player.escudoAtivo) ctx.drawImage(skins.escudo, player.x-10, player.y-10, 80, 80);
    
    invasores.forEach(inv => {
        if(inv.vivo || (inv.isBoss && inv.hp > 0)) {
            let img = inv.isBoss ? (inv.tipo === 2 ? skins.chefe2 : skins.chefe) : skins.alien;
            if(inv.tipo !== 3) ctx.drawImage(img, inv.x, inv.y, inv.w, inv.h);
        }
    });

    tiros.forEach(t => {
        if(t.isFireball) ctx.drawImage(skins.fireball, t.x, t.y, t.w, t.h);
        else { ctx.fillStyle = "#fff"; ctx.fillRect(t.x, t.y, t.w, t.h); }
    });

    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
