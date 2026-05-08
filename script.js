// Utilitários e Inicialização
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

// Carregamento de Skins
const skins = {
    player: new Image(), amigo: new Image(), alien: new Image(),
    chefe: new Image(), chefe2: new Image(), fireball: new Image(), escudo: new Image(),
    criador: new Image(),
    nexusVortex: new Image() // Skin do Chefe Especial da Fase 7
};
skins.player.src = 'jogadorprincipal.png';
skins.amigo.src = 'amigo.png';
skins.alien.src = 'alien.png';
skins.chefe.src = 'chefe1.png';
skins.chefe2.src = 'chefe2.png';
skins.fireball.src = 'bola-defogo.png';
skins.escudo.src = 'escudo.png';
skins.criador.src = 'criador.png';
skins.nexusVortex.src = 'nexus-vortex.png'; // Nome exato do arquivo que você vai salvar!

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

// Controle específico de Diálogo e Introdução da Fase 7
let emDialogoFase7 = false;
let indiceFraseFase7 = 0;
const frasesFase7 = [
    "Nexus Vortex: Ora, ora... Parece que temos um invasor persistentemente ousado.",
    "Nexus Vortex: Meus escudos orbitais absorvem qualquer impacto!",
    "Nexus Vortex: E os meus disparos teleguiados não te darão descanso!",
    "SISTEMA: [ O DESAFIO COMEÇOU! PREPARE-SE! ]"
];

// Variáveis específicas para o Boss da Fase 7 (Nexus Vortex)
let escudosOrbitais = [];
let tirosTeleguiados = [];

// Falas do Nexus Vortex durante a luta
const falasNexus = [
    "Nexus: Meus escudos são impenetráveis para sua tecnologia!",
    "Nexus: Desvie disso se puder! TIRO RASTREADOR INICIADO!",
    "Nexus: Clones de assalto, destruam o invasor!",
    "Nexus: O campo de força consome sua esperança!"
];

// Física de balanço/inclinação para o Player (velX controla a rotação lateral)
const player = { 
    x: 370, y: 520, w: 60, h: 60, tx: 370, velX: 0, vidas: 3, 
    danoTime: 0, kills: 0, cooldown: 0, 
    escudoAtivo: false, escudoTimer: 0 
};
const amigo = { x: -150, y: 450, w: 60, h: 60, tx: -150, velX: 0 };
let invasores = [];
let tiros = [];
let tirosE = [];
let particulas = [];
const keys = {};
let frameAnim = 0;

// Falas do Chefe Supremo adaptadas ao estilo Tokitobashi
const falasChefe = [
    "TOKITOBASHI!", 
    "O tempo volta a correr... depois que eu decidir!",
    "Sua velocidade é irrelevante frente ao Salto Temporal!",
    "Preveja isto se for capaz!"
];

// Controle de Tremor de Tela (Screen Shake) por código
let tremorIntensidade = 0;
function aplicarTremor(forca) {
    tremorIntensidade = Math.max(tremorIntensidade, forca);
}

// Funções Globais (Chamadas pelo HTML)
window.permitirAudio = function() {
    $('overlay-start').style.display = 'none';
    $('menu-principal').style.display = 'block';
    somMenu.play().catch(error => console.warn("Interação prévia necessária para o áudio.", error));
    [somTempo, somTiroPlayer, somTiroInimigo].forEach(s => {
        s.muted = true;
        s.play().then(() => {
            s.pause();
            s.currentTime = 0;
            s.muted = false;
        }).catch(e => console.warn("Não foi possível pré-carregar os efeitos.", e));
    });
};

window.iniciarHistoria = function(){
    somMenu.pause(); 
    $('menu-principal').style.display = 'none';
    $('game-container').style.display = 'block';
    modo = 'historia';
    amigo.tx = 200;
    player.tx = 500;
    falar("Hunter: Eu consigo derrotar esses alienígenas sozinho!", 2200, ()=>{
        falar("Amigo: Hunter, você enlouqueceu? São muitos!", 2200, ()=>{
            falar("Hunter: Vou mostrar do que sou capaz!", 1500, ()=>{
                modo = 'jogando';
                amigo.tx = -200; player.tx = 370;
                criarFase();
            });
        });
    });
};

// Funções para controlar a exibição do Guia de Chefes
window.abrirGuiaBosses = function() {
    $('guia-bosses-painel').classList.add('show');
};
window.fecharGuiaBosses = function() {
    $('guia-bosses-painel').classList.remove('show');
};

// Lógica de Jogo
function falar(texto, tempo, cb){
    const box = $('dialogo-box');
    box.innerText = texto;
    box.classList.add('show');
    setTimeout(()=>{ box.classList.remove('show'); cb && cb(); }, tempo);
}

// Desenha a caixa de diálogo no canvas para a animação de introdução do boss
function desenharIntroducaoBoss7() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, 800, 600);
    const x = 50, y = 400, w = 700, h = 160;
    ctx.fillStyle = "#0c051a";
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 4;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 45);
    ctx.lineTo(x + w - 10, y + 45);
    ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#c084fc";
    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillText("NEXUS VORTEX - RECEPTÁCULO SUPREMO", x + 25, y + 33);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px 'Courier New', monospace";
    const textoMax = frasesFase7[indiceFraseFase7];
    if (textoMax.length > 60) {
        ctx.fillText(textoMax.substring(0, 60), x + 25, y + 75);
        ctx.fillText(textoMax.substring(60), x + 25, y + 100);
    } else {
        ctx.fillText(textoMax, x + 25, y + 75);
    }
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillText("Pressione [ESPAÇO] ou [ENTER] para continuar...", x + w - 340, y + h - 15);
    ctx.restore();
}

function criarFase(){
    invasores = [];
    tiros = []; tirosE = []; particulas = [];
    avisandoHabilidade = false;
    bossMorrendo = false;
    escudosOrbitais = [];
    tirosTeleguiados = [];
    player.escudoAtivo = false; player.escudoTimer = 0;
    const bossBar = $('boss-hp-bar'), bossLabel = $('boss-hp-label'), container = $('game-container');
    bossBar.style.display = 'none'; bossLabel.style.display = 'none';
    container.classList.remove('shake');
    
    if(faseAtual === 7 || (faseAtual > 7 && (faseAtual - 7) % 10 === 0)){
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "NEXUS VORTEX: O TITÃ DE DEFESA";
        $('boss-hp-fill').style.width = '100%';
        if (faseAtual === 7) {
            emDialogoFase7 = true;
            indiceFraseFase7 = 0;
        }
        invasores.push({
            x: 310, y: 100, w: 180, h: 120,
            hp: 1000, maxHp: 1000,
            isBoss: true, tipo: 4,
            dir: 1, vel: 2.0,
            ultimoTiro: 0,
            ultimoBot: 0,
            anguloEscudos: 0
        });
        escudosOrbitais = [
            { anguloOffset: 0, hp: 400, maxHp: 400, raio: 130, w: 45, h: 45, x: 0, y: 0, vivo: true },
            { anguloOffset: Math.PI, hp: 400, maxHp: 400, raio: 130, w: 45, h: 45, x: 0, y: 0, vivo: true }
        ];
        contadorTempo = 0;
    }
    else if(faseAtual % 15 === 0){
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "O CRIADOR DE MUNDOS";
        $('boss-hp-fill').style.width = '100%';
        const bossHp = 6000 + faseAtual * 250;
        invasores.push({ 
            x: 300, y: 80, w: 200, h: 160, 
            hp: bossHp, maxHp: bossHp, 
            isBoss: true, tipo: 3, 
            dir: 1, vel: 1.5,
            timerInvocacao: 0,
            usouCura: false 
        });
        contadorTempo = 0;
    } 
    else if(faseAtual % 10 === 0){
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "MK-II: O ANULADOR";
        $('boss-hp-fill').style.width = '100%';
        invasores.push({ x: 300, y: 80, w: 180, h: 150, hp: 8000, maxHp: 8000, isBoss: true, tipo: 2, dir: 1, vel: 2.8 });
        invasores.push({ x: 260, y: 60, w: 250, h: 190, hp: 600, maxHp: 600, isShield: true });
    } 
    else if(faseAtual % 5 === 0){
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "ASSASSINO DO TEMPO";
        $('boss-hp-fill').style.width = '100%';
        const bossHp = 5000 + faseAtual * 200;
        invasores.push({ x: 300, y: 80, w: 200, h: 160, hp: bossHp, maxHp: bossHp, isBoss: true, tipo: 1, dir: 1, vel: 1.4 });
        const shieldHp = 400 + faseAtual * 20;
        invasores.push({ x: 260, y: 60, w: 280, h: 200, hp: shieldHp, maxHp: shieldHp, isShield: true });
        for(let i = 0; i < 4; i++) invasores.push({ x: 120 + i * 170, y: 330, w: 55, h: 55, vivo: true, dir: 1, vel: 1.2 });
        contadorTempo = 0;
    } 
    else {
        const cols = 5;
        const rows = 2 + Math.min(2, Math.floor(faseAtual/3));
        for(let r = 0; r < rows; r++) {
            for(let c = 0; c < cols; c++) {
                invasores.push({ x: c * 110 + 130, y: r * 70 + 70, w: 55, h: 55, vivo: true, dir: 1, vel: 0.8 + faseAtual * 0.15 });
            }
        }
    }
}

// Controles e Habilidades
window.addEventListener('keydown', e => {
    if (emDialogoFase7) {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            indiceFraseFase7++;
            if (indiceFraseFase7 >= frasesFase7.length) {
                emDialogoFase7 = false; // Começa o jogo!
            }
        }
        return;
    }

    keys[e.code] = true;
    if(!tempoParado && modo === 'jogando' && !bossMorrendo) {
        if(e.code === 'KeyE') { if(player.kills >= 3){ tiros.push({ x: player.x + player.w/2 - 25, y: player.y - 20, w: 50, h: 50, s: 9, isFireball: true }); player.kills -= 3; } }
        if(e.code === 'KeyR') { if(player.kills >= 2 && !player.escudoAtivo){ player.escudoAtivo = true; player.escudoTimer = 2000; player.kills -= 2; } }
    }
    if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Explosões Orgânicas
function explodir(x, y, color){
    const quantidade = color === '#00f6ff' || color === '#00ffaa' ? 24 : 16;
    for(let i = 0; i < quantidade; i++){
        const a = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 4; 
        particulas.push({ 
            x, 
            y, 
            vx: Math.cos(a) * sp,  
            vy: Math.sin(a) * sp, 
            life: 30 + Math.random() * 20,  
            maxLife: 50,
            size: 2 + Math.random() * 4, 
            color 
        });
    }
}

// Desenhar Nave com Inclinação Dinâmica (Roll) e balanço orgânico
function desenharNave(obj, color, isPlayer){
    ctx.save();
    const cx = obj.x + obj.w/2, cy = obj.y + obj.h/2;
    const flutua = Math.sin(frameAnim * 0.06 + obj.x * 0.04) * 3.5;
    ctx.translate(cx, cy + flutua);
    if(isPlayer) {
        const inclinacaoMax = 0.25;
        let inclinacaoAlvo = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) inclinacaoAlvo = -inclinacaoMax;
        if (keys['ArrowRight'] || keys['KeyD']) inclinacaoAlvo = inclinacaoMax;
        player.velX += (inclinacaoAlvo - player.velX) * 0.15;
        ctx.rotate(player.velX);
    } else {
        if(obj.dir) {
            ctx.rotate(obj.dir * 0.08 + Math.cos(frameAnim * 0.05) * 0.03);
        }
    }

    if(isPlayer && player.danoTime > 0 && Math.floor(player.danoTime/4)%2) ctx.globalAlpha = 0.4;
    const img = isPlayer ? skins.player : (obj.x === amigo.x ? skins.amigo : skins.alien);
    if (img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, -obj.w/2, -obj.h/2, obj.w, obj.h);
    } else {
        ctx.fillStyle = color;
        if(isPlayer){ 
            ctx.beginPath(); ctx.moveTo(0, -obj.h/2); ctx.lineTo(obj.w/2, obj.h/2); ctx.lineTo(0, obj.h/3);
            ctx.lineTo(-obj.w/2, obj.h/2); ctx.closePath(); ctx.fill(); 
        } else { 
            ctx.beginPath();
            ctx.ellipse(0,0,obj.w/2,obj.h/2.2,0,0,Math.PI*2); ctx.fill(); 
        }
    }
    
    if(isPlayer && player.escudoAtivo) {
        ctx.restore();
        ctx.save(); ctx.translate(cx, cy + flutua); 
        ctx.rotate(frameAnim * 0.05);
        const escalaPulso = 1.0 + Math.sin(frameAnim * 0.15) * 0.05;
        if (skins.escudo.complete && skins.escudo.naturalWidth !== 0) { 
            ctx.globalAlpha = 0.5 + Math.sin(frameAnim*0.2)*0.15;
            ctx.drawImage(skins.escudo, -obj.w*0.8 * escalaPulso, -obj.h*0.8 * escalaPulso, obj.w*1.6 * escalaPulso, obj.h*1.6 * escalaPulso);
        } else { 
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0,0, obj.w*0.8 * escalaPulso, 0, Math.PI*2); ctx.stroke(); 
        }
    }
    ctx.restore();
}

const tempCanvas = document.createElement('canvas');
const tempCtx = tempCanvas.getContext('2d');
let imgCriadorProcessada = null;
let imgNexusProcessada = null;
function desenharBoss(obj){
    ctx.save();
    const cx = obj.x + obj.w/2, cy = obj.y + obj.h/2;
    const escalaRespiracaoY = 1.0 + Math.sin(frameAnim * 0.04) * 0.03;
    const escalaRespiracaoX = 1.0 - Math.sin(frameAnim * 0.04) * 0.01;
    ctx.translate(cx, cy + Math.sin(frameAnim*0.04) * 5);
    ctx.scale(escalaRespiracaoX, escalaRespiracaoY);
    
    if(bossMorrendo) ctx.filter = `hue-rotate(${frameAnim*15}deg) brightness(2)`;
    
    let img = skins.chefe;
    if(obj.tipo === 2) img = skins.chefe2;
    
    if(obj.tipo === 4) {
        img = skins.nexusVortex;
        if (img.complete && img.naturalWidth !== 0) {
            if (!imgNexusProcessada || imgNexusProcessada.width !== img.naturalWidth) {
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(img, 0, 0);
                const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 220 && data[i+1] > 220 && data[i+2] > 220) {
                        data[i+3] = 0;
                    }
                }
                tempCtx.putImageData(imgData, 0, 0);
                imgNexusProcessada = new Image();
                imgNexusProcessada.src = tempCanvas.toDataURL();
            }
            img = imgNexusProcessada;
        }
    }
    
    if(obj.tipo === 3) {
        img = skins.criador;
        if (img.complete && img.naturalWidth !== 0) {
            if (!imgCriadorProcessada || imgCriadorProcessada.width !== img.naturalWidth) {
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(img, 0, 0);
                const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 220 && data[i+1] > 220 && data[i+2] > 220) {
                        data[i+3] = 0;
                    }
                }
                tempCtx.putImageData(imgData, 0, 0);
                imgCriadorProcessada = new Image();
                imgCriadorProcessada.src = tempCanvas.toDataURL();
            }
            img = imgCriadorProcessada;
        }
    } 

    if (img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, -obj.w/2, -obj.h/2, obj.w, obj.h);
    } else { 
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = (obj.tipo === 4) ? "rgba(168, 85, 247, 0.9)" : "rgba(0, 210, 255, 0.8)";
        ctx.strokeStyle = (obj.tipo === 4) ? "#a855f7" : "#00d2ff";
        ctx.lineWidth = 4;
        ctx.fillStyle = "rgba(15, 10, 30, 0.9)";
        ctx.beginPath();
        ctx.moveTo(0, -obj.h/2);
        ctx.lineTo(obj.w/2, obj.h/4);
        ctx.lineTo(obj.w/3, obj.h/2);
        ctx.lineTo(-obj.w/3, obj.h/2);
        ctx.lineTo(-obj.w/2, obj.h/4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

function desenharEscudoBoss(obj){
    ctx.save(); ctx.translate(obj.x + obj.w/2, obj.y + obj.h/2);
    const pulso = 1.0 + Math.sin(frameAnim * 0.1) * 0.04;
    ctx.scale(pulso, pulso);
    if (skins.escudo.complete && skins.escudo.naturalWidth !== 0) { 
        ctx.globalAlpha = 0.4 + Math.sin(frameAnim*0.1)*0.15;
        ctx.drawImage(skins.escudo, -obj.w/2, -obj.h/2, obj.w, obj.h);
    } else { 
        ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.arc(0, 0, obj.w/2, 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();
}

// Desenhar Bolas de Fogo Especiais com rastro
function desenharFireball(t){
    const w = t.w || 50, h = t.h || 50;
    ctx.save();
    ctx.translate(t.x + w/2, t.y + h/2);
    ctx.rotate(frameAnim*0.2);
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 15;
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

// Efeito visual do Tokitobashi (Tela Trincada)
function desenharRachadurasEspacoTempo() {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 246, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f6ff';
    ctx.shadowBlur = 15;
    const centerX = 400;
    const centerY = 300;
    const numeroRachadurasPrincipais = 8;
    const seed = Math.floor(frameAnim * 0.1);
    
    for (let i = 0; i < numeroRachadurasPrincipais; i++) {
        let x = centerX;
        let y = centerY;
        let angulo = (i * (Math.PI * 2) / numeroRachadurasPrincipais) + (Math.sin(seed + i) * 0.2);
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        const segmentos = 5;
        const comprimentoSegmento = 80 + (Math.sin(seed * i) * 20);
        
        for (let j = 0; j < segmentos; j++) {
            angulo += (Math.sin(seed + j + i) * 0.4) - 0.2;
            x += Math.cos(angulo) * comprimentoSegmento;
            y += Math.sin(angulo) * comprimentoSegmento;
            ctx.lineTo(x, y);
            
            if (j > 1 && Math.sin(seed + j) > 0) {
                ctx.save();
                ctx.lineWidth = 1.2;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.moveTo(x, y);
                let anguloRamo = angulo + 0.8;
                ctx.lineTo(x + Math.cos(anguloRamo) * 40, y + Math.sin(anguloRamo) * 40);
                ctx.stroke();
                ctx.restore();
            }
        }
        ctx.stroke();
    }
    ctx.restore();
}

function colide(r1, r2){
    const w1 = r1.w || 6, h1 = r1.h || 20;
    const w2 = r2.w || 6, h2 = r2.h || 20;
    return r1.x < r2.x + w2 && r1.x + w1 > r2.x && r1.y < r2.y + h2 && r1.y + h1 > r2.y;
}

// Game Loop Principal
function gameLoop(now){
    const dt = now - lastTime;
    lastTime = now;
    
    ctx.clearRect(0,0,800,600);
    frameAnim++;
    
    // Aplicação do tremor da tela
    ctx.save();
    if(tremorIntensidade > 0.1) {
        const dx = (Math.random() - 0.5) * tremorIntensidade;
        const dy = (Math.random() - 0.5) * tremorIntensidade;
        ctx.translate(dx, dy);
        tremorIntensidade *= 0.90; // Amortecimento
    }
    
    // Limitação de velocidade para manter as naves alinhadas
    player.x += (player.tx - player.x) * 0.12;
    amigo.x += (amigo.tx - amigo.x) * 0.1;
    
    if(player.cooldown > 0) player.cooldown -= dt;
    if(player.escudoAtivo){
        player.escudoTimer -= dt;
        if(player.escudoTimer <= 0) player.escudoAtivo = false;
    }
    
    if(amigo.x > -100) {
        desenharNave(amigo, '#00d2ff', false);
    }
    desenharNave(player, '#00ff88', true);
    
    if(modo !== 'jogando'){
        ctx.restore();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    $('fase-txt').innerText = faseAtual;
    $('vidas-txt').innerText = player.vidas;
    $('hab-txt').innerText = Math.min(player.kills, 3);
    $('escudo-txt').innerText = Math.min(player.kills, 2);
    
    const boss = invasores.find(i=>i.isBoss && i.hp>0);
    const shield = invasores.find(i=>i.isShield && i.hp>0);
    
    const bossMortoCheck = invasores.find(i=>i.isBoss && i.hp <= 0 && !bossMorrendo);
    if(bossMortoCheck){
        bossMorrendo = true;
        aplicarTremor(15);
        let falaMorte = "Inimigo: Como isso é possível?!";
        if(bossMortoCheck.tipo === 1) falaMorte = "Assassino: O tempo... não pôde me salvar...";
        if(bossMortoCheck.tipo === 2) falaMorte = "MK-II: Nos veremos novamente mortal...";
        if(bossMortoCheck.tipo === 3) falaMorte = "Criador: Este universo ainda será meu...";
        if(bossMortoCheck.tipo === 4) falaMorte = "Nexus: Sistemas integrados falhando... Escudos colapsando!";
        
        falar(falaMorte, 3500, () => {
            invasores = invasores.filter(i => !i.isBoss && !i.isBlocoProtetor && !i.isShield);
            escudosOrbitais = [];
            tirosTeleguiados = [];
            faseAtual++;
            criarFase();
        });
    }
    
    // COMPORTAMENTO EXCLUSIVO DO CHEFE DA FASE 7 (NEXUS VORTEX)
    if(boss && boss.tipo === 4 && !tempoParado && !bossMorrendo && !emDialogoFase7){
        boss.x += boss.vel * boss.dir * (dt/16);
        if (boss.x < 50 || boss.x > 800 - boss.w - 50) {
            boss.dir *= -1;
            boss.x += boss.vel * boss.dir * (dt/16);
        }
        
        // Rotaciona o ângulo dos escudos ao redor do boss
        boss.anguloEscudos += 0.02 * (dt/16);
        escudosOrbitais.forEach(esc => {
            if(esc.vivo) {
                const anguloTotal = boss.anguloEscudos + esc.anguloOffset;
                esc.x = (boss.x + boss.w/2 - esc.w/2) + Math.cos(anguloTotal) * esc.raio;
                esc.y = (boss.y + boss.h/2 - esc.h/2) + Math.sin(anguloTotal) * esc.raio;
                
                // Regeneração passiva sutil dos escudos orbitais
                if(esc.hp < esc.maxHp) esc.hp += 0.05 * (dt/16);
            }
        });
        
        // Mecânica de Ataque 1: Tiros Teleguiados que buscam o jogador
        boss.ultimoTiro += dt;
        if(boss.ultimoTiro >= 3200){
            boss.ultimoTiro = 0;
            // Instancia 1 tiro teleguiado no centro do boss
            tirosTeleguiados.push({
                x: boss.x + boss.w/2 - 8,
                y: boss.y + boss.h - 10,
                w: 16, h: 16,
                vel: 3.5,
                rastro: []
            });
            aplicarTremor(4);
            
            // Fala aleatória de combate
            if(Math.random() < 0.45) {
                falar(falasNexus[Math.floor(Math.random() * falasNexus.length)], 1600);
            }
        }
        
        // Mecânica de Ataque 2: Invoca 2 naves normais de assalto de tempos em tempos
        boss.ultimoBot += dt;
        if(boss.ultimoBot >= 7000) {
            boss.ultimoBot = 0;
            falar("Nexus: Clones de assalto iniciados!", 1500);
            for(let i = 1; i <= 2; i++) {
                invasores.push({ x: boss.x + (boss.w / 3) * i, y: boss.y + boss.h + 10, w: 55, h: 55, vivo: true, dir: (i === 1) ? 1 : -1, vel: 1.2 });
                explodir(boss.x + (boss.w / 3) * i + 25, boss.y + boss.h + 20, '#ff9900');
            }
        }
    }
    
    if (!emDialogoFase7) {
        for(let i = tirosTeleguiados.length - 1; i >= 0; i--){
            const tt = tirosTeleguiados[i];
            const dx = (player.x + player.w/2) - tt.x;
            const dy = (player.y + player.h/2) - tt.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if(dist > 0) {
                tt.x += (dx / dist) * tt.vel * (dt/16);
                tt.y += (dy / dist) * tt.vel * (dt/16);
            }
            tt.rastro.push({x: tt.x, y: tt.y});
            if(tt.rastro.length > 10) tt.rastro.shift();
            
            if (colide(tt, player)) {
                tirosTeleguiados.splice(i, 1);
                if (!player.escudoAtivo && player.danoTime <= 0) {
                    player.vidas--;
                    player.danoTime = 60;
                    aplicarTremor(12);
                    explodir(player.x + player.w/2, player.y + player.h/2, '#ff0055');
                } else if (player.escudoAtivo) {
                    explodir(tt.x, tt.y, '#00d2ff');
                    aplicarTremor(3);
                }
                continue;
            }
            
            let destruido = false;
            for(let t of tiros){
                const tx = t.x, ty = t.y, tw = t.w || 6, th = t.h || 20;
                if(tt.x < tx + tw && tt.x + tt.w > tx && tt.y < ty + th && tt.y + tt.h > ty){
                    explodir(tt.x, tt.y, '#a855f7');
                    tirosTeleguiados.splice(i, 1);
                    t.destruido = true;
                    destruido = true;
                    aplicarTremor(2);
                    break;
                }
            }
            if(destruido) continue;
            
            if(tt.y > 620) {
                tirosTeleguiados.splice(i, 1);
            }
        }
    }
    
    // IA do Criador de Mundos (Fase 15)
    if(boss && boss.tipo === 3 && !tempoParado && !bossMorrendo){
        boss.x += boss.vel * boss.dir * (dt/16);
        if(boss.x < 50 || boss.x > 550) { boss.dir *= -1; boss.x += boss.vel * boss.dir * (dt/16); }
        
        boss.timerInvocacao += dt;
        if(boss.timerInvocacao >= 6000){
            boss.timerInvocacao = 0;
            falar("Criador: Ergam-se, meus servos!", 1500);
            for(let i=0; i<3; i++) {
                invasores.push({ x: boss.x + i*70 - 40, y: boss.y + boss.h + 20, w:55, h:55, vivo:true, dir:1, vel:1.2 });
                explodir(boss.x + i*70 - 15, boss.y + boss.h + 40, '#00ffaa');
            }
        }
        if(boss.hp < boss.maxHp * 0.35 && !boss.usouCura){
            boss.usouCura = true;
            falar("Criador: Reconstruindo núcleo de energia vital!", 2500);
            boss.hp = Math.min(boss.maxHp, boss.hp + 1500);
            explodir(boss.x + boss.w/2, boss.y + boss.h/2, '#00ffaa');
            aplicarTremor(10);
        }
    }
    
    // IA do Assassino Temporal (Fase 5 - Tokitobashi)
    else if(boss && boss.tipo === 1) { 
        contadorTempo += dt;
        if(!tempoParado && contadorTempo >= 7500){
            tempoParado = true;
            contadorTempo = 0;
            somTempo.play();
            falar(falasChefe[Math.floor(Math.random()*falasChefe.length)], 2500, ()=>{
                tempoParado = false;
                contadorTempo = 0;
            });
        }
        if(!tempoParado && Math.random() < 0.03 * (dt/16)){
            tirosE.push({ x: boss.x + boss.w/2 - 2, y: boss.y + boss.h, s: 4.5 });
            somTiroInimigo.currentTime = 0;
            somTiroInimigo.play();
        }
    } 
    
    // Invasores Comuns Atirando
    else { 
        invasores.forEach(inv => {
            if(!inv.isBoss && !inv.isShield && inv.vivo && Math.random() < 0.00065 * (dt/16)){
                tirosE.push({ x: inv.x + inv.w/2, y: inv.y + inv.h, s: 4 });
                somTiroInimigo.currentTime = 0;
                somTiroInimigo.play();
            }
        });
    }
    
    // Movimentação do Player e Disparo de Tiros Normais
    if(!bossMorrendo) {
        if(keys['Space'] && player.cooldown <= 0){
            tiros.push({ x: player.x + player.w/2 - 3, y: player.y - 15 });
            player.cooldown = 180; // cooldown original de disparos normais
            somTiroPlayer.currentTime = 0;
            somTiroPlayer.play();
        }
        if((keys['ArrowLeft'] || keys['KeyA']) && player.x > 10) player.tx -= 5.5 * (dt/16);
        if((keys['ArrowRight'] || keys['KeyD']) && player.x < 730) player.tx += 5.5 * (dt/16);
    }
    
    // IA e Movimentação Geral dos Invasores Comuns
    let mudarLado = false;
    invasores.forEach(inv => {
        if(inv.isBoss || inv.isShield) return;
        if(!inv.vivo) return;
        inv.x += inv.vel * inv.dir * (dt/16);
        if(inv.x > 740 || inv.x < 10) mudarLado = true;
    });
    if(mudarLado){
        invasores.forEach(inv => {
            if(inv.isBoss || inv.isShield) return;
            inv.dir *= -1;
            inv.y += 20;
        });
    }
    
    // Comportamento do Chefe MK-II e seu Escudo Protetor (Fase 10)
    if(boss && boss.tipo === 2 && !tempoParado && !bossMorrendo){
        boss.x += boss.vel * boss.dir * (dt/16);
        if(boss.x < 50 || boss.x > 570) { boss.dir *= -1; boss.x += boss.vel * boss.dir * (dt/16); }
        if(Math.random() < 0.04 * (dt/16)){
            tirosE.push({ x: boss.x + boss.w/2 - 40, y: boss.y + boss.h, s: 5 });
            tirosE.push({ x: boss.x + boss.w/2 + 40, y: boss.y + boss.h, s: 5 });
            somTiroInimigo.currentTime = 0;
            somTiroInimigo.play();
        }
    }
    if(shield && boss && !bossMorrendo){
        shield.x = boss.x - 40;
        shield.y = boss.y - 15;
    }
    
    // Movimento dos Tiros do Jogador
    for(let tIdx = tiros.length - 1; tIdx >= 0; tIdx--){
        let t = tiros[tIdx];
        if(t.destruido) {
            tiros.splice(tIdx, 1);
            continue;
        }
        
        t.y -= (t.s || 6) * (dt/16);
        if(t.y < -50){ tiros.splice(tIdx, 1); continue; }
        
        let consumed = false;
        
        // Verifica se acertou o escudo orbital do Boss da Fase 7 antes de chegar nele
        if (escudosOrbitais.length > 0 && !consumed) {
            for(let esc of escudosOrbitais) {
                if (esc.vivo && colide(t, esc)) {
                    let dano = t.isFireball ? 50 : 40;
                    esc.hp -= dano;
                    explodir(t.x, t.y, '#00f6ff');
                    aplicarTremor(t.isFireball ? 4 : 1);
                    if(esc.hp <= 0) {
                        esc.vivo = false;
                        explodir(esc.x + esc.w/2, esc.y + esc.h/2, '#ff0055');
                        falar("Nexus: Um dos meus escudos colapsou!", 2000);
                        aplicarTremor(14);
                    }
                    consumed = true;
                    break;
                }
            }
        }
        if(consumed) {
            tiros.splice(tIdx, 1);
            continue;
        }
        
        for(let inv of invasores){
            if((inv.vivo || inv.isBoss || inv.isShield) && colide(t, inv)){
                // Se acertou o boss MK-II com seu Escudo Ativo protetor, anula o disparo
                if(inv.isBoss && inv.tipo === 2 && shield) {
                    explodir(t.x, t.y, '#666');
                    consumed = true;
                    break;
                }
                if(inv.isBoss || inv.isShield || inv.isBlocoProtetor){
                    // Dano da bola de fogo balanceado para 50, e tiro normal 40
                    let danoAplicado = t.isFireball ? 50 : 40;
                    inv.hp -= danoAplicado;
                    explodir(t.x + (t.isFireball ? 25 : 3), t.y + (t.isFireball ? 25 : 10), inv.isBoss ? '#ff0055' : '#00d2ff');
                    aplicarTremor(t.isFireball ? 4 : 1);
                } else {
                    inv.vivo = false;
                    player.kills++;
                    explodir(inv.x + inv.w/2, inv.y + inv.h/2, '#ff0055');
                    aplicarTremor(2);
                }
                consumed = true;
                break;
            }
        }
        if(consumed) tiros.splice(tIdx, 1);
    }
    
    // Colisão Física dos Tiros Inimigos contra o Jogador (Não se movem no Tokitobashi)
    if(!tempoParado){
        for(let teIdx = tirosE.length - 1; teIdx >= 0; teIdx--){
            let te = tirosE[teIdx];
            if(colide(te, player)){
                tirosE.splice(teIdx, 1);
                if(!player.escudoAtivo && player.danoTime <= 0){
                    player.vidas--;
                    player.danoTime = 60; // 1 segundo de imunidade (a 60 FPS)
                    aplicarTremor(12);
                    explodir(player.x + player.w/2, player.y + player.h/2, '#ff0055');
                } else if(player.escudoAtivo){
                    explodir(te.x, te.y, '#00d2ff');
                    aplicarTremor(3);
                }
                continue;
            }
            te.y += te.s * (dt/16);
            if(te.y > 620) tirosE.splice(teIdx, 1);
        }
    }
    
    // Imunidade pós-dano
    if(player.danoTime > 0) player.danoTime--;
    
    // Renderização dos Elementos no Canvas
    invasores.forEach(inv => {
        if(inv.isBoss && inv.hp > 0) {
            desenharBoss(inv);
        } 
        else if(inv.isShield && inv.hp > 0) {
            desenharEscudoBoss(inv);
        }
        else if(inv.vivo) {
            desenharNave(inv, '#ff0055', false);
        }
    });
    
    // Renderiza graficamente escudos orbitais da fase 7 se estiverem ativos
    escudosOrbitais.forEach(esc => {
        if(esc.vivo) {
            ctx.save();
            ctx.translate(esc.x + esc.w/2, esc.y + esc.h/2);
            ctx.rotate(frameAnim * 0.1);
            if (skins.escudo.complete && skins.escudo.naturalWidth !== 0) {
                ctx.drawImage(skins.escudo, -esc.w/2, -esc.h/2, esc.w, esc.h);
            } else {
                ctx.strokeStyle = '#00f6ff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, esc.w/2, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
            
            // Barra de vida física de cada escudo ativo
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(esc.x, esc.y - 8, esc.w, 4);
            ctx.fillStyle = "#00f6ff";
            ctx.fillRect(esc.x, esc.y - 8, esc.w * (esc.hp / esc.maxHp), 4);
        }
    });
    
    // Barra de Vida dos Chefes na Interface Superior
    if(boss){
        $('boss-hp-fill').style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
    }
    
    // Tiros normais e fireball do player
    tiros.forEach(t => {
        if(t.isFireball){
            desenharFireball(t);
        } else {
            ctx.save();
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#fff';
            ctx.fillRect(t.x, t.y, t.w || 6, t.h || 20);
            ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
            ctx.fillRect(t.x, t.y + (t.h || 20), t.w || 6, (t.h || 20) * 1.5);
            ctx.restore();
        }
    });
    
    // Tiros Inimigos Normais
    tirosE.forEach(te => {
        ctx.save();
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fff';
        ctx.fillRect(te.x, te.y, 5, 15);
        ctx.fillStyle = 'rgba(255, 0, 85, 0.4)';
        ctx.fillRect(te.x, te.y - 10, 5, 10);
        ctx.restore();
    });
    
    // Tiros Teleguiados do Boss 7
    tirosTeleguiados.forEach(tt => {
        // Desenha o rastro luminoso
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
        ctx.beginPath();
        for(let r = 0; r < tt.rastro.length; r++){
            if(r === 0) ctx.moveTo(tt.rastro[r].x, tt.rastro[r].y);
            else ctx.lineTo(tt.rastro[r].x, tt.rastro[r].y);
        }
        ctx.stroke();
        ctx.restore();

        // Orb de Energia do Tiro
        ctx.save();
        ctx.translate(tt.x, tt.y);
        ctx.rotate(frameAnim * 0.15);
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    });
    
    // Partículas com Física de Inércia, Atrito e Escala
    particulas.forEach((p, i)=>{ 
        p.x += p.vx * (dt/16); 
        p.y += p.vy * (dt/16); 
        p.vx *= 0.94; 
        p.vy *= 0.94;
        p.life -= dt/16; 
        
        if(p.life <= 0) {
            particulas.splice(i, 1);
            return;
        }
        
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    });
    
    // Alerta Visual de Habilidade Especial Pronta
    if(player.kills >= 3 && !avisandoHabilidade){
        avisandoHabilidade = true;
        aplicarTremor(3);
    }
    
    // Efeito Visual de Distorção de Espaço-Tempo (Tokitobashi ativo)
    if(tempoParado){
        desenharRachadurasEspacoTempo();
        ctx.fillStyle = "rgba(0, 246, 255, 0.08)";
        ctx.fillRect(0,0,800,600);
    }
    
    // Renderiza a introdução de diálogo no topo se a fase 7 começar
    if (emDialogoFase7) {
        desenharIntroducaoBoss7();
    }
    
    ctx.restore(); // Finaliza o screen shake tremor
    
    // Derrota do jogador
    if(player.vidas <= 0){
        somMenu.pause();
        alert("GAME OVER! A Terra foi dominada!");
        location.reload();
        return;
    }
    
    // Condição de Vitória Geral do Jogo
    if(faseAtual > 15){
        alert("PARABÉNS! Você derrotou O Criador de Mundos e salvou o universo!");
        location.reload();
        return;
    }
    
    requestAnimationFrame(gameLoop);
}

// Inicia o Loop principal de renderização
requestAnimationFrame(gameLoop);
