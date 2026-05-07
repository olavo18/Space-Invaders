// Garante que a função seja vista pelo HTML
window.iniciarJogo = function() {
    const overlay = document.getElementById('overlay-start');
    const container = document.getElementById('game-container');
    if (overlay) overlay.style.display = 'none';
    if (container) container.style.display = 'block';
    
    rodando = true;
    carregarAssets();
    criarFase();
    requestAnimationFrame(loop);
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const assets = {
    img: {
        player: 'jogadorprincipal.png',
        alien: 'alien.png',
        chefe1: 'chefe1.png',
        chefe2: 'chefe2.png'
    },
    snd: {
        menu: 'menu.mp3',
        nave1: 'nave1.mp3'
    }
};

const imgLoaded = {};
const sndLoaded = {};

function carregarAssets() {
    for (let key in assets.img) {
        imgLoaded[key] = new Image();
        imgLoaded[key].src = assets.img[key];
    }
    for (let key in assets.snd) {
        sndLoaded[key] = new Audio(assets.snd[key]);
    }
}

let fase = 1, player = { x: 375, y: 530, w: 50, h: 50, vidas: 3 };
let invasores = [], tiros = [], keys = {}, rodando = false;

function criarFase() {
    invasores = [];
    if (fase % 5 === 0) {
        invasores.push({ x: 300, y: 50, w: 150, h: 100, hp: 500, isBoss: true, dir: 1 });
    } else {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 7; c++) {
                invasores.push({ x: c * 80 + 120, y: r * 50 + 80, w: 40, h: 40, vivo: true, dir: 1 });
            }
        }
    }
}

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function loop() {
    if (!rodando) return;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if ((keys.ArrowLeft || keys.KeyA) && player.x > 0) player.x -= 7;
    if ((keys.ArrowRight || keys.KeyD) && player.x < 750) player.x += 7;
    
    if (keys.Space && tiros.length < 5) {
        tiros.push({ x: player.x + 23, y: player.y, w: 4, h: 15 });
        keys.Space = false;
    }

    for (let i = tiros.length - 1; i >= 0; i--) {
        tiros[i].y -= 8;
        ctx.fillStyle = "cyan";
        ctx.fillRect(tiros[i].x, tiros[i].y, tiros[i].w, tiros[i].h);
        if (tiros[i].y < 0) tiros.splice(i, 1);
    }

    let vivos = 0;
    invasores.forEach(inv => {
        if (inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
        vivos++;
        inv.x += inv.dir * (1 + fase * 0.2);
        if (inv.x > 750 || inv.x < 0) { inv.dir *= -1; inv.y += 20; }
        
        ctx.fillStyle = inv.isBoss ? "red" : "green";
        ctx.fillRect(inv.x, inv.y, inv.w, inv.h);
        
        // Se as imagens carregarem, desenha elas por cima
        let sprite = inv.isBoss ? imgLoaded.chefe1 : imgLoaded.alien;
        if (sprite && sprite.complete) ctx.drawImage(sprite, inv.x, inv.y, inv.w, inv.h);
    });

    if (vivos === 0) { fase++; criarFase(); }

    ctx.fillStyle = "blue";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    if (imgLoaded.player && imgLoaded.player.complete) {
        ctx.drawImage(imgLoaded.player, player.x, player.y, player.w, player.h);
    }

    document.getElementById('fase-txt').innerText = fase;
    document.getElementById('vidas-txt').innerText = player.vidas;

    requestAnimationFrame(loop);
}
