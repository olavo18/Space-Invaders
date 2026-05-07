// Força a função a ser reconhecida pelo HTML imediatamente
window.iniciarJogo = function() {
    const overlay = document.getElementById('overlay-start');
    const container = document.getElementById('game-container');
    
    if (overlay) overlay.style.display = 'none';
    if (container) container.style.display = 'block';
    
    rodando = true;
    criarFase();
    requestAnimationFrame(loop);
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configuração dos seus arquivos (use exatamente os nomes da sua lista)
const img = {
    player: new Image(),
    alien: new Image(),
    chefe1: new Image(),
    chefe2: new Image()
};

img.player.src = 'jogadorprincipal.png';
img.alien.src = 'alien.png';
img.chefe1.src = 'chefe1.png';
img.chefe2.src = 'chefe2.png';

let fase = 1, player = { x: 375, y: 530, w: 50, h: 50, vidas: 3 };
let invasores = [], tiros = [], keys = {}, rodando = false;

function criarFase() {
    invasores = [];
    tiros = [];
    let ehBoss = fase % 5 === 0;
    
    if (ehBoss) {
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
    
    // Fundo preto
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 800, 600);

    // Movimentação
    if ((keys.ArrowLeft || keys.KeyA) && player.x > 0) player.x -= 7;
    if ((keys.ArrowRight || keys.KeyD) && player.x < 750) player.x += 7;
    if (keys.Space && tiros.length < 5) {
        tiros.push({ x: player.x + 23, y: player.y, w: 4, h: 15 });
        keys.Space = false;
    }

    // Desenho Tiros
    for (let i = tiros.length - 1; i >= 0; i--) {
        tiros[i].y -= 8;
        ctx.fillStyle = "cyan";
        ctx.fillRect(tiros[i].x, tiros[i].y, tiros[i].w, tiros[i].h);
        if (tiros[i].y < 0) tiros.splice(i, 1);
    }

    // Desenho Inimigos
    let vivos = 0;
    invasores.forEach(inv => {
        if (inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
        vivos++;
        inv.x += inv.dir * (1 + fase * 0.2);
        if (inv.x > 750 || inv.x < 0) { inv.dir *= -1; inv.y += 20; }
        
        // Desenha a imagem se carregada, senão desenha um bloco
        let sprite = inv.isBoss ? img.chefe1 : img.alien;
        if (sprite.complete && sprite.naturalWidth !== 0) {
            ctx.drawImage(sprite, inv.x, inv.y, inv.w, inv.h);
        } else {
            ctx.fillStyle = inv.isBoss ? "red" : "green";
            ctx.fillRect(inv.x, inv.y, inv.w, inv.h);
        }
    });

    if (vivos === 0) { fase++; criarFase(); }

    // Desenho Player
    if (img.player.complete && img.player.naturalWidth !== 0) {
        ctx.drawImage(img.player, player.x, player.y, player.w, player.h);
    } else {
        ctx.fillStyle = "blue";
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    // Atualiza a UI
    const faseTxt = document.getElementById('fase-txt');
    const vidasTxt = document.getElementById('vidas-txt');
    if (faseTxt) faseTxt.innerText = fase;
    if (vidasTxt) vidasTxt.innerText = player.vidas;

    requestAnimationFrame(loop);
}
