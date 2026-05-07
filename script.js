const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Assets - Verifique se os nomes dos arquivos no seu GitHub são IGUAIS a estes
const img = {
    player: new Image(), alien: new Image(), chefe: new Image(), chefe2: new Image()
};
img.player.src = 'jogadorprincipal.png';
img.alien.src = 'alien.png';
img.chefe.src = 'chefe1.png';
img.chefe2.src = 'chefe2.png';

let fase = 1, modo = 'espera', lastTime = 0;
let player = { x: 370, y: 520, w: 60, h: 60, vidas: 3, kills: 0 };
let invasores = [], tiros = [];
let keys = {};

// Funções de Inicialização
function permitirAudio() {
    document.getElementById('overlay-start').style.display = 'none';
    document.getElementById('menu-principal').style.display = 'block';
}

function iniciarJogo() {
    document.getElementById('menu-principal').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    modo = 'jogando';
    criarFase();
    requestAnimationFrame(loop);
}

function criarFase() {
    invasores = [];
    tiros = [];
    const colunas = 6, linhas = 3;
    
    // Lógica de Boss a cada 5 fases
    if (fase % 5 === 0) {
        document.getElementById('boss-hp-bar').style.display = 'block';
        invasores.push({ 
            x: 300, y: 50, w: 150, h: 100, hp: 1000 * (fase/5), maxHp: 1000 * (fase/5), 
            isBoss: true, dir: 1, vel: 2 
        });
    } else {
        document.getElementById('boss-hp-bar').style.display = 'none';
        for (let r = 0; r < linhas; r++) {
            for (let c = 0; c < colunas; c++) {
                invasores.push({ x: c * 80 + 150, y: r * 60 + 80, w: 40, h: 40, vivo: true, dir: 1 });
            }
        }
    }
}

// Controles
window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

function loop(t) {
    if (modo !== 'jogando') return;
    let dt = t - lastTime; lastTime = t;
    ctx.clearRect(0, 0, 800, 600);

    // Movimentação Player
    if ((keys.ArrowLeft || keys.KeyA) && player.x > 0) player.x -= 5;
    if ((keys.ArrowRight || keys.KeyD) && player.x < 740) player.x += 5;
    if (keys.Space && tiros.length < 3) {
        tiros.push({ x: player.x + 28, y: player.y, w: 4, h: 15 });
    }

    // Tiros e Colisão
    tiros.forEach((tiro, index) => {
        tiro.y -= 7;
        if (tiro.y < 0) tiros.splice(index, 1);

        invasores.forEach(inv => {
            if (!inv.vivo && !inv.isBoss) return;
            if (tiro.x < inv.x + inv.w && tiro.x + tiro.w > inv.x && tiro.y < inv.y + inv.h) {
                if (inv.isBoss) {
                    inv.hp -= 20;
                    document.getElementById('boss-hp-fill').style.width = (inv.hp/inv.maxHp*100) + "%";
                    if (inv.hp <= 0) inv.vivo = false;
                } else {
                    inv.vivo = false;
                    player.kills++;
                }
                tiros.splice(index, 1);
            }
        });
    });

    // Movimentação Inimigos e Checagem de Vitória
    let vivos = 0;
    invasores.forEach(inv => {
        if (inv.isBoss && inv.hp <= 0) return;
        if (!inv.isBoss && !inv.vivo) return;
        
        vivos++;
        inv.x += (inv.dir * (1 + fase * 0.2));
        if (inv.x > 760 || inv.x < 0) {
            invasores.forEach(i => { i.dir *= -1; i.y += 10; });
        }
        
        // Desenho Inimigos
        ctx.drawImage(inv.isBoss ? img.chefe : img.alien, inv.x, inv.y, inv.w, inv.h);
    });

    if (vivos === 0) {
        fase++;
        criarFase();
    }

    // Desenho Player e UI
    ctx.drawImage(img.player, player.x, player.y, player.w, player.h);
    document.getElementById('fase-txt').innerText = fase;
    document.getElementById('kills-txt').innerText = player.kills;

    requestAnimationFrame(loop);
}
