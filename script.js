// FORÇA AS FUNÇÕES SEREM GLOBAIS PARA O HTML ENXERGAR
window.permitirAudio = function() {
    document.getElementById('overlay-start').style.display = 'none';
    document.getElementById('menu-principal').style.display = 'flex';
    sons.menu.play().catch(e => console.log("Erro som:", e));
};

window.iniciarHistoria = function() {
    document.getElementById('menu-principal').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    sons.menu.pause();
    falar("Hunter: Vamos acabar com eles!", 2000, () => {
        rodando = true;
        criarFase();
        loop();
    });
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Assets
const img = {
    player: new Image(), alien: new Image(), chefe1: new Image(), chefe2: new Image(),
    fire: new Image(), amigo: new Image()
};
img.player.src = 'jogadorprincipal.png';
img.alien.src = 'alien.png';
img.chefe1.src = 'chefe1.png';
img.chefe2.src = 'chefe2.png';
img.fire.src = 'bola-defogo.png';
img.amigo.src = 'amigo.png';

const sons = {
    menu: new Audio('menu.mp3'),
    tiro: new Audio('nave1.mp3')
};
sons.menu.loop = true;

let fase = 1, rodando = false;
let player = { x: 375, y: 530, w: 50, h: 50, kills: 0, vidas: 3, escudo: false };
let invasores = [], tiros = [], keys = {};

function falar(texto, tempo, callback) {
    const box = document.getElementById('dialogo-box');
    box.innerText = texto;
    box.classList.add('show');
    setTimeout(() => {
        box.classList.remove('show');
        if(callback) callback();
    }, tempo);
}

function criarFase() {
    invasores = [];
    tiros = [];
    const ehBoss = fase % 5 === 0;
    document.getElementById('boss-hp-bar').style.display = ehBoss ? 'block' : 'none';

    if (ehBoss) {
        let sprite = (fase % 10 === 0) ? img.chefe2 : img.chefe1;
        invasores.push({ x: 300, y: 60, w: 180, h: 120, hp: 500 * (fase/5), maxHp: 500 * (fase/5), isBoss: true, dir: 1, img: sprite });
    } else {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
                invasores.push({ x: c * 80 + 100, y: r * 50 + 80, w: 40, h: 40, vivo: true, dir: 1 });
            }
        }
    }
}

window.addEventListener('keydown', e => { 
    keys[e.code] = true; 
    // Habilidades
    if(rodando) {
        if(e.code === 'KeyE' && player.kills >= 3) {
            tiros.push({ x: player.x, y: player.y, w: 50, h: 50, especial: true });
            player.kills -= 3;
        }
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

function loop() {
    if (!rodando) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 800, 600);

    // Movimento Player
    if ((keys.ArrowLeft || keys.KeyA) && player.x > 0) player.x -= 7;
    if ((keys.ArrowRight || keys.KeyD) && player.x < 750) player.x += 7;
    
    if (keys.Space && tiros.length < 5) {
        tiros.push({ x: player.x + 23, y: player.y, w: 4, h: 15 });
        sons.tiro.cloneNode().play();
        keys.Space = false;
    }

    // Processar Tiros
    for (let i = tiros.length - 1; i >= 0; i--) {
        let t = tiros[i];
        t.y -= 8;
        if (t.especial) ctx.drawImage(img.fire, t.x, t.y, t.w, t.h);
        else { ctx.fillStyle = "#0ff"; ctx.fillRect(t.x, t.y, t.w, t.h); }

        invasores.forEach(inv => {
            if (inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
            if (t.x < inv.x + inv.w && t.x + t.w > inv.x && t.y < inv.y + inv.h) {
                if (inv.isBoss) {
                    inv.hp -= (t.especial ? 100 : 20);
                    document.getElementById('boss-hp-fill').style.width = (inv.hp/inv.maxHp*100) + "%";
                } else {
                    inv.vivo = false;
                    player.kills++;
                }
                if(!t.especial) tiros.splice(i, 1);
            }
        });
        if (t.y < 0) tiros.splice(i, 1);
    }

    // Invasores
    let vivos = 0;
    invasores.forEach(inv => {
        if (inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
        vivos++;
        inv.x += (inv.dir * (1.2 + fase * 0.2));
        if (inv.x > 750 || inv.x < 10) { invasores.forEach(i => { i.dir *= -1; i.y += 20; }); }
        
        ctx.drawImage(inv.isBoss ? inv.img : img.alien, inv.x, inv.y, inv.w, inv.h);
        if (inv.y > 500) player.vidas = 0;
    });

    if (vivos === 0) { fase++; criarFase(); }

    // Desenho Player e UI
    ctx.drawImage(img.player, player.x, player.y, player.w, player.h);
    document.getElementById('fase-txt').innerText = fase;
    document.getElementById('vidas-txt').innerText = player.vidas;
    document.getElementById('hab-txt').innerText = Math.floor(player.kills/3);

    if (player.vidas <= 0) {
        alert("Fim de Jogo!");
        location.reload();
    } else {
        requestAnimationFrame(loop);
    }
}
