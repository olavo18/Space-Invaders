const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Imagens - Verifique se os nomes batem com os arquivos no GitHub!
const img = {
    player: new Image(), alien: new Image(), chefe: new Image()
};
img.player.src = 'jogadorprincipal.png';
img.alien.src = 'alien.png';
img.chefe.src = 'chefe1.png';

let fase = 1, player = { x: 375, y: 530, w: 50, h: 50, vidas: 3, kills: 0 };
let invasores = [], tiros = [], keys = {}, rodando = false;

function iniciar() {
    document.getElementById('overlay-start').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    rodando = true;
    criarFase();
    loop();
}

function criarFase() {
    invasores = [];
    tiros = [];
    document.getElementById('boss-bar').style.display = (fase % 5 === 0) ? 'block' : 'none';

    if (fase % 5 === 0) {
        // Boss
        invasores.push({ 
            x: 300, y: 60, w: 160, h: 100, isBoss: true, 
            hp: 500 * (fase / 5), maxHp: 500 * (fase / 5), dir: 1 
        });
    } else {
        // Inimigos normais
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 7; c++) {
                invasores.push({ x: c * 80 + 120, y: r * 60 + 80, w: 40, h: 40, vivo: true, dir: 1 });
            }
        }
    }
}

window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

function loop() {
    if (!rodando) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);

    // Player
    if ((keys.ArrowLeft || keys.KeyA) && player.x > 0) player.x -= 6;
    if ((keys.ArrowRight || keys.KeyD) && player.x < 750) player.x += 6;
    if (keys.Space && tiros.length < 4) {
        tiros.push({ x: player.x + 23, y: player.y, w: 4, h: 15 });
        keys.Space = false; // Evita tiro infinito segurando
    }

    // Tiros
    tiros.forEach((t, i) => {
        t.y -= 8;
        if (t.y < 0) tiros.splice(i, 1);
        ctx.fillStyle = '#0ff';
        ctx.fillRect(t.x, t.y, t.w, t.h);

        // Colisão
        invasores.forEach(inv => {
            if (inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
            if (t.x < inv.x + inv.w && t.x + t.w > inv.x && t.y < inv.y + inv.h) {
                if (inv.isBoss) {
                    inv.hp -= 25;
                    document.getElementById('boss-fill').style.width = (inv.hp/inv.maxHp*100) + "%";
                } else {
                    inv.vivo = false;
                    player.kills++;
                }
                tiros.splice(i, 1);
            }
        });
    });

    // Invasores
    let vivos = 0;
    invasores.forEach(inv => {
        if (inv.vivo === false || (inv.isBoss && inv.hp <= 0)) return;
        vivos++;
        
        inv.x += (inv.dir * (1.2 + fase * 0.2));
        if (inv.x > 750 || inv.x < 10) {
            invasores.forEach(i => { i.dir *= -1; i.y += 15; });
        }
        
        ctx.drawImage(inv.isBoss ? img.chefe : img.alien, inv.x, inv.y, inv.w, inv.h);
        
        if (inv.y > 500) player.vidas = 0; // Game Over se chegarem perto
    });

    if (vivos === 0) { fase++; criarFase(); }

    // UI e Desenho Player
    ctx.drawImage(img.player, player.x, player.y, player.w, player.h);
    document.getElementById('fase-txt').innerText = fase;
    document.getElementById('vidas-txt').innerText = player.vidas;
    document.getElementById('kills-txt').innerText = player.kills;

    if (player.vidas <= 0) {
        alert("GAME OVER! Fase alcançada: " + fase);
        location.reload();
    } else {
        requestAnimationFrame(loop);
    }
}
