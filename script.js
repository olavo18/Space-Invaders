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
somTempo.volume = 0.6;
somTiroPlayer.volume = 0.3;
somTiroInimigo.volume = 0.2;

// Variáveis de Estado do Jogo
let modo = 'menu'; // menu, historia, jogando, gameover
let faseAtual = 1;
let tempoParado = false;
let contadorTempo = 0; // Controla ciclos do Tokitobashi
let lastTime = performance.now();
let avisandoHabilidade = false;
let bossMorrendo = false;

// Controle específico de Diálogo e Introdução da Fase 7
let emDialogoFase7 = false;
let indiceFraseFase7 = 0;
const frasesFase7 = [
    "Nexus Vortex: Ora, ora... Parece que temos um invasor persistente.",
    "Nexus Vortex: Meus escudos orbitais absorvem qualquer impacto de frente!",
    "Nexus Vortex: E os meus disparos teleguiados não te darão descanso!",
    "SISTEMA: [ O DESAFIO COMEÇOU! PREPARE-SE! ]"
];

// Variáveis específicas para o Boss da Fase 7 (Nexus Vortex)
let escudosOrbitais = [];
let tirosTeleguiados = [];

const falasNexus = [
    "Nexus: Meus escudos são impenetráveis para sua tecnologia obsoleta!",
    "Nexus: Desvie disso se puder! TIRO RASTREADOR INICIADO!",
    "Nexus: Clones de assalto, destruam o invasor!",
    "Nexus: O campo de força consome sua esperança de vitória!"
];

// Configurações das Entidades (Física de balanço e inclinação adicionadas)
const player = {
    x: 370,
    y: 520,
    w: 60,
    h: 60,
    tx: 370,      // Posição X alvo (Target X) para interpolação suave
    velX: 0,      // Velocidade/Momento horizontal para cálculo de inclinação da nave
    vidas: 3,
    danoTime: 0,
    kills: 0,
    cooldown: 0,
    escudoAtivo: false,
    escudoTimer: 0
};

const amigo = {
    x: -150,
    y: 450,
    w: 60,
    h: 60,
    tx: -150,     // Target X do Amigo
    velX: 0
};

let invasores = [];
let tiros = [];
let tirosE = [];
let particulas = [];
const keys = {};
let frameAnim = 0;

const falasChefe = [
    "TOKITOBASHI!",
    "O tempo volta a correr... depois que eu decidir!",
    "Sua velocidade é irrelevante frente ao Salto Temporal!",
    "Preveja isto se for capaz!"
];

// Controle de Tremor de Tela (Screen Shake)
let tremorIntensidade = 0;
function aplicarTremor(forca) {
    tremorIntensidade = Math.max(tremorIntensidade, forca);
}

// Ouvintes de Eventos de Teclado globais
window.addEventListener('keydown', e => {
    // Intercepta comandos caso a introdução narrativa do Boss da Fase 7 esteja ativa
    if (emDialogoFase7) {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            indiceFraseFase7++;
            if (indiceFraseFase7 >= frasesFase7.length) {
                emDialogoFase7 = false; // Fecha a introdução e libera a gameplay
            }
        }
        return;
    }

    keys[e.code] = true;
    
    // Habilidades Especiais disparadas via comandos no teclado (Apenas se o tempo não estiver congelado)
    if(!tempoParado && modo === 'jogando' && !bossMorrendo) {
        if(e.code === 'KeyE') { // Habilidade 1: Disparo de Bola de Fogo de Área Gigante (Gasta 3 Kills)
            if(player.kills >= 3){
                tiros.push({
                    x: player.x + player.w/2 - 25,
                    y: player.y - 20,
                    w: 50,
                    h: 50,
                    s: 9,
                    isFireball: true
                });
                player.kills -= 3;
            }
        }
        if(e.code === 'KeyR') { // Habilidade 2: Escudo de Força Protetor Temporário (Gasta 2 Kills)
            if(player.kills >= 2 && !player.escudoAtivo){
                player.escudoAtivo = true;
                player.escudoTimer = 2000; // Duração absoluta de 2 segundos (2000 milissegundos)
                player.kills -= 2;
            }
        }
    }

    if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(e.code)) e.preventDefault();
});

window.addEventListener('keyup', e => { keys[e.code] = false; });

// Mapeamento de Funções do Ciclo de Eventos da Janela para onclicks do HTML
window.permitirAudio = function() {
    $('overlay-start').style.display = 'none';
    $('menu-principal').style.display = 'block';
    
    somMenu.play().catch(error => {
        console.warn("Interação prévia bloqueada ou áudio desativado pelo navegador.", error);
    });

    [somTempo, somTiroPlayer, somTiroInimigo].forEach(s => {
        s.muted = true;
        s.play().then(() => {
            s.pause();
            s.currentTime = 0;
            s.muted = false;
        }).catch(e => console.warn("Erro ao inicializar canais de som.", e));
    });
};

window.iniciarHistoria = function() {
    somMenu.pause();
    $('menu-principal').style.display = 'none';
    $('game-container').style.display = 'block';
    $('game-over').style.display = 'none'; // MODIFICAÇÃO: Esconde a div de Game Over se reiniciar por aqui
    
    modo = 'historia';
    amigo.tx = 200; 
    player.tx = 500;
    
    falar("Hunter: Eu consigo derrotar esses alienígenas sozinho!", 2200, () => {
        falar("Amigo: Hunter, você enlouqueceu? São muitos deles vindo!", 2200, () => {
            falar("Hunter: Não importa, vou mostrar do que o nosso sistema é capaz!", 1500, () => {
                modo = 'jogando';
                amigo.tx = -200; 
                player.tx = 370;
                criarFase();
            });
        });
    });
};

window.abrirGuiaBosses = function() {
    $('guia-bosses-painel').classList.add('show');
};

window.fecharGuiaBosses = function() {
    $('guia-bosses-painel').classList.remove('show');
};

function falar(texto, tempo, cb) {
    const box = $('dialogo-box');
    box.innerText = texto;
    box.classList.add('show');
    setTimeout(() => {
        box.classList.remove('show');
        if(cb) cb();
    }, tempo);
}

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

function criarFase() {
    invasores = [];
    tiros = [];
    tirosE = [];
    particulas = [];
    avisandoHabilidade = false;
    bossMorrendo = false;
    escudosOrbitais = [];
    tirosTeleguiados = [];
    player.escudoAtivo = false;
    player.escudoTimer = 0;
    
    const bossBar = $('boss-hp-bar');
    const bossLabel = $('boss-hp-label');
    const container = $('game-container');
    
    bossBar.style.display = 'none';
    bossLabel.style.display = 'none';
    container.classList.remove('shake');
    
    // MODIFICAÇÃO: Sincronização direta com as tags <span> do seu HTML real
    $('fase-txt').innerText = faseAtual;
    
    // LÓGICA DE SPAWN DA FASE 7 - BOSS ESPECIAL: NEXUS VORTEX
    if (faseAtual === 7 || (faseAtual > 7 && (faseAtual - 7) % 10 === 0)) {
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "NEXUS VORTEX: O TITÃ DE DEFESA";
        $('boss-hp-fill').style.width = '100%';
        
        if (faseAtual === 7) {
            emDialogoFase7 = true;
            indiceFraseFase7 = 0;
        }
        
        // Spawn do núcleo do Boss
        invasores.push({
            x: 310,
            y: 100,
            w: 180,
            h: 120,
            hp: 1000,
            maxHp: 1000,
            isBoss: true,
            tipo: 4, // Identificador único do Nexus Vortex
            dir: 1,
            vel: 2.0,
            ultimoTiro: 0,
            ultimoBot: 0,
            anguloEscudos: 0
        });
        
        // Inicialização dos módulos de escudos rotativos orbitais
        escudosOrbitais = [
            { anguloOffset: 0, hp: 400, maxHp: 400, raio: 130, w: 45, h: 45, x: 0, y: 0, vivo: true },
            { anguloOffset: Math.PI, hp: 400, maxHp: 400, raio: 130, w: 45, h: 45, x: 0, y: 0, vivo: true }
        ];
        
        contadorTempo = 0;
    }
    // CONFIGURAÇÕES DOS DEMAIS CHEFES DO JOGO (Fases 5, 10, 15)
    else if (faseAtual % 15 === 0) {
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "O CRIADOR DE MUNDOS";
        $('boss-hp-fill').style.width = '100%';
        
        const bossHp = 6000 + (faseAtual * 250);
        invasores.push({
            x: 300,
            y: 80,
            w: 200,
            h: 160,
            hp: bossHp,
            maxHp: bossHp,
            isBoss: true,
            tipo: 3,
            dir: 1,
            vel: 1.5,
            timerInvocacao: 0,
            usouCura: false
        });
        contadorTempo = 0;
    }
    else if (faseAtual % 10 === 0) {
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "MK-II: O ANULADOR";
        $('boss-hp-fill').style.width = '100%';
        
        invasores.push({
            x: 300,
            y: 80,
            w: 180,
            h: 150,
            hp: 8000,
            maxHp: 8000,
            isBoss: true,
            tipo: 2,
            dir: 1,
            vel: 2.8
        });
        
        invasores.push({
            x: 260,
            y: 60,
            w: 250,
            h: 190,
            hp: 600,
            maxHp: 600,
            isShield: true
        });
    }
    else if (faseAtual % 5 === 0) {
        bossBar.style.display = 'block';
        bossLabel.style.display = 'block';
        bossLabel.innerText = "ASSASSINO DO TEMPO";
        $('boss-hp-fill').style.width = '100%';
        
        const bossHp = 5000 + (faseAtual * 200);
        invasores.push({
            x: 300,
            y: 80,
            w: 200,
            h: 160,
            hp: bossHp,
            maxHp: bossHp,
            isBoss: true,
            tipo: 1,
            dir: 1,
            vel: 1.4
        });
        
        const shieldHp = 400 + (faseAtual * 20);
        invasores.push({
            x: 260,
            y: 60,
            w: 280,
            h: 200,
            hp: shieldHp,
            maxHp: shieldHp,
            isShield: true
        });
        
        for (let i = 0; i < 4; i++) {
            invasores.push({
                x: 120 + (i * 170),
                y: 330,
                w: 55,
                h: 55,
                vivo: true,
                dir: 1,
                vel: 1.2
            });
        }
        contadorTempo = 0;
    } 
    // Ondas normais de Invasores Comuns
    else {
        const cols = 5;
        const rows = 2 + Math.min(2, Math.floor(faseAtual / 3));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                invasores.push({
                    x: c * 110 + 130,
                    y: r * 70 + 70,
                    w: 55,
                    h: 55,
                    vivo: true,
                    dir: 1,
                    vel: 0.8 + (faseAtual * 0.15)
                });
            }
        }
    }
}

function explodir(x, y, color) {
    const quantidade = (color === '#00f6ff' || color === '#00ffaa') ? 24 : 16;
    for (let i = 0; i < quantidade; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 4;
        particulas.push({
            x: x,
            y: y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            size: 2 + Math.random() * 4,
            color: color
        });
    }
}

// Renderizador com balanço dinâmico e inclinação lateral baseado nas teclas
function desenharNave(obj, color, isPlayer) {
    ctx.save();
    const cx = obj.x + obj.w / 2;
    const cy = obj.y + obj.h / 2;
    const flutua = Math.sin(frameAnim * 0.06 + obj.x * 0.04) * 3.5;
    
    ctx.translate(cx, cy + flutua);
    
    if (isPlayer) {
        const inclinacaoMax = 0.25; 
        let inclinacaoAlvo = 0;
        
        if (keys['ArrowLeft'] || keys['KeyA']) inclinacaoAlvo = -inclinacaoMax;
        if (keys['ArrowRight'] || keys['KeyD']) inclinacaoAlvo = inclinacaoMax;
        
        player.velX += (inclinacaoAlvo - player.velX) * 0.15;
        ctx.rotate(player.velX);
    } else {
        if (obj.dir) {
            ctx.rotate(obj.dir * 0.08 + Math.cos(frameAnim * 0.05) * 0.03);
        }
    }
    
    if (isPlayer && player.danoTime > 0 && Math.floor(player.danoTime / 4) % 2) {
        ctx.globalAlpha = 0.4;
    }
    
    const img = isPlayer ? skins.player : (obj.x === amigo.x ? skins.amigo : skins.alien);
    if (img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, -obj.w / 2, -obj.h / 2, obj.w, obj.h);
    } else {
        ctx.fillStyle = color;
        if (isPlayer) {
            ctx.beginPath();
            ctx.moveTo(0, -obj.h / 2);
            ctx.lineTo(obj.w / 2, obj.h / 2);
            ctx.lineTo(0, obj.h / 3);
            ctx.lineTo(-obj.w / 2, obj.h / 2);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(0, 0, obj.w / 2, obj.h / 2.2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Campo de Força de Energia do Escudo Ativo
    if (isPlayer && player.escudoAtivo) {
        ctx.restore();
        ctx.save();
        ctx.translate(cx, cy + flutua);
        ctx.rotate(frameAnim * 0.05);
        
        const escalaPulso = 1.0 + Math.sin(frameAnim * 0.15) * 0.05;
        if (skins.escudo.complete && skins.escudo.naturalWidth !== 0) {
            ctx.globalAlpha = 0.5 + Math.sin(frameAnim * 0.2) * 0.15;
            ctx.drawImage(skins.escudo, -obj.w * 0.8 * escalaPulso, -obj.h * 0.8 * escalaPulso, obj.w * 1.6 * escalaPulso, obj.h * 1.6 * escalaPulso);
        } else {
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, obj.w * 0.8 * escalaPulso, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

// Canvas temporário e variáveis para remover fundos brancos de imagens de chefes em tempo real
const tempCanvas = document.createElement('canvas');
const tempCtx = tempCanvas.getContext('2d');
let imgCriadorProcessada = null;
let imgNexusProcessada = null;

function desenharBoss(obj) {
    ctx.save();
    const cx = obj.x + obj.w / 2;
    const cy = obj.y + obj.h / 2;
    
    const escalaRespiracaoY = 1.0 + Math.sin(frameAnim * 0.04) * 0.03;
    const escalaRespiracaoX = 1.0 - Math.sin(frameAnim * 0.04) * 0.01;
    
    ctx.translate(cx, cy + Math.sin(frameAnim * 0.04) * 5);
    ctx.scale(escalaRespiracaoX, escalaRespiracaoY);
    
    if (bossMorrendo) {
        ctx.filter = `hue-rotate(${frameAnim * 15}deg) brightness(2)`;
    }
    
    let img = skins.chefe;
    if (obj.tipo === 2) img = skins.chefe2;
    
    if (obj.tipo === 4) {
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
    
    if (obj.tipo === 3) {
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
        ctx.drawImage(img, -obj.w / 2, -obj.h / 2, obj.w, obj.h);
    } else {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = (obj.tipo === 4) ? "rgba(168, 85, 247, 0.9)" : "rgba(0, 210, 255, 0.8)";
        ctx.strokeStyle = (obj.tipo === 4) ? "#a855f7" : "#00d2ff";
        ctx.lineWidth = 4;
        ctx.fillStyle = "rgba(15, 10, 30, 0.9)";
        
        ctx.beginPath();
        ctx.moveTo(0, -obj.h / 2);
        ctx.lineTo(obj.w / 2, obj.h / 4);
        ctx.lineTo(obj.w / 3, obj.h / 2);
        ctx.lineTo(-obj.w / 3, obj.h / 2);
        ctx.lineTo(-obj.w / 2, obj.h / 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

function desenharEscudoBoss(obj) {
    ctx.save();
    ctx.translate(obj.x + obj.w / 2, obj.y + obj.h / 2);
    const pulso = 1.0 + Math.sin(frameAnim * 0.1) * 0.04;
    ctx.scale(pulso, pulso);
    
    if (skins.escudo.complete && skins.escudo.naturalWidth !== 0) {
        ctx.globalAlpha = 0.4 + Math.sin(frameAnim * 0.1) * 0.15;
        ctx.drawImage(skins.escudo, -obj.w / 2, -obj.h / 2, obj.w, obj.h);
    } else {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, obj.w / 2, obj.h / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function desenharFireball(t) {
    ctx.save();
    const w = t.w || 50;
    const h = t.h || 50;
    ctx.translate(t.x + w / 2, t.y + h / 2);
    ctx.rotate(frameAnim * 0.2);
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 15;
    
    if (skins.fireball.complete && skins.fireball.naturalWidth !== 0) {
        ctx.drawImage(skins.fireball, -w / 2, -h / 2, w, h);
    } else {
        ctx.fillStyle = '#ffae3b';
        ctx.beginPath();
        ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function desenharRachadurasEspacoTempo() {
    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    
    ctx.beginPath();
    ctx.moveTo(100, 0);
    ctx.lineTo(150, 120);
    ctx.lineTo(120, 250);
    ctx.lineTo(200, 380);
    ctx.lineTo(180, 600);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(700, 0);
    ctx.lineTo(620, 180);
    ctx.lineTo(680, 320);
    ctx.lineTo(590, 490);
    ctx.lineTo(640, 600);
    ctx.stroke();
    
    ctx.restore();
}

function alternarTempo() {
    if (faseAtual % 5 === 0 || faseAtual % 10 === 0 || faseAtual % 15 === 0 || (faseAtual === 7 || (faseAtual > 7 && (faseAtual - 7) % 10 === 0))) {
        tempoParado = !tempoParado;
        somTempo.play().catch(() => {});
        aplicarTremor(12);
        
        // MODIFICAÇÃO: Conecta diretamente com a div '#efeito-tempo' do seu CSS/HTML real
        if (tempoParado) {
            $('efeito-tempo').style.opacity = '1';
            
            const falaAleatoria = falasChefe[Math.floor(Math.random() * falasChefe.length)];
            const boss = invasores.find(inv => inv.isBoss);
            if (boss && boss.tipo === 4) {
                falar(falasNexus[Math.floor(Math.random() * falasNexus.length)], 2000);
            } else {
                falar("CHEFE SUPREMO: " + falaAleatoria, 1800);
            }
        } else {
            $('efeito-tempo').style.opacity = '0';
        }
    }
}

function checarColisao(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(dt) {
    frameAnim++;
    
    if (player.danoTime > 0) player.danoTime -= dt;
    if (player.cooldown > 0) player.cooldown -= dt;
    if (player.escudoAtivo) {
        player.escudoTimer -= dt;
        if (player.escudoTimer <= 0) player.escudoAtivo = false;
    }
    
    // MODIFICAÇÃO: Atualiza em tempo real as tags <span> criadas na sua camada de UI HTML
    $('hab-txt').innerText = Math.min(3, Math.floor(player.kills));
    $('escudo-txt').innerText = Math.min(2, Math.floor(player.kills));
    $('vidas-txt').innerText = player.vidas;

    player.x += (player.tx - player.x) * 0.22 * (dt / 16);
    amigo.x += (amigo.tx - amigo.x) * 0.08 * (dt / 16);
    
    if (modo === 'jogando' && !emDialogoFase7) {
        contadorTempo += dt;
        if (contadorTempo >= 6500 && !bossMorrendo) {
            contadorTempo = 0;
            alternarTempo();
        }
        
        const movespeed = 5.5 * (dt / 16);
        if ((keys['ArrowLeft'] || keys['KeyA']) && player.tx > 10) player.tx -= movespeed;
        if ((keys['ArrowRight'] || keys['KeyD']) && player.tx < 800 - player.w - 10) player.tx += movespeed;
        
        if (keys['Space'] && player.cooldown <= 0 && !bossMorrendo) {
            tiros.push({ x: player.x + player.w / 2 - 3, y: player.y, w: 6, h: 16, s: -8 });
            somTiroPlayer.currentTime = 0;
            somTiroPlayer.play().catch(() => {});
            player.cooldown = 220;
        }
        
        const bossPrincipal = invasores.find(inv => inv.isBoss && inv.tipo === 4);
        if (bossPrincipal && !tempoParado && !bossMorrendo) {
            bossPrincipal.anguloEscudos += 0.03 * (dt / 16);
            const cx = bossPrincipal.x + bossPrincipal.w / 2;
            const cy = bossPrincipal.y + bossPrincipal.h / 2;
            
            escudosOrbitais.forEach(esc => {
                if (esc.vivo) {
                    const ang = bossPrincipal.anguloEscudos + esc.anguloOffset;
                    esc.x = cx + Math.cos(ang) * esc.raio - esc.w / 2;
                    esc.y = cy + Math.sin(ang) * esc.raio - esc.h / 2;
                }
            });
            
            if (performance.now() - bossPrincipal.ultimoTiro > 3200) {
                bossPrincipal.ultimoTiro = performance.now();
                tirosTeleguiados.push({
                    x: cx,
                    y: bossPrincipal.y + bossPrincipal.h,
                    w: 16,
                    h: 16,
                    vx: 0,
                    vy: 2,
                    rastro: [],
                    timerRastreio: 2500
                });
            }
            
            if (performance.now() - bossPrincipal.ultimoBot > 5000) {
                bossPrincipal.ultimoBot = performance.now();
                invasores.push(
                    { x: bossPrincipal.x - 40, y: bossPrincipal.y + 30, w: 45, h: 45, vivo: true, dir: -1, vel: 2, deSuporte: true },
                    { x: bossPrincipal.x + bossPrincipal.w + 10, y: bossPrincipal.y + 30, w: 45, h: 45, vivo: true, dir: 1, vel: 2, deSuporte: true }
                );
            }
        }
        
        for (let i = tirosTeleguiados.length - 1; i >= 0; i--) {
            let tt = tirosTeleguiados[i];
            if (!tempoParado) {
                tt.timerRastreio -= dt;
                tt.rastro.push({ x: tt.x + tt.w / 2, y: tt.y + tt.h / 2 });
                if (tt.rastro.length > 10) tt.rastro.shift();
                
                if (tt.timerRastreio > 0) {
                    let dx = (player.x + player.w / 2) - tt.x;
                    let dy = (player.y + player.h / 2) - tt.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        let velMax = 4.2;
                        tt.vx = (dx / dist) * velMax;
                        tt.vy = (dy / dist) * velMax;
                    }
                }
                tt.x += tt.vx * (dt / 16);
                tt.y += tt.vy * (dt / 16);
            }
            
            if (checarColisao(tt, player)) {
                if (!player.escudoAtivo && player.danoTime <= 0) {
                    player.vidas--;
                    player.danoTime = 1200;
                    aplicarTremor(10);
                    if (player.vidas <= 0) finalizarJogo(); // Chamada unificada para o HTML
                }
                tirosTeleguiados.splice(i, 1);
                continue;
            }
            if (tt.y > 620 || tt.x < -20 || tt.x > 820) {
                tirosTeleguiados.splice(i, 1);
            }
        }
        
        for (let i = tiros.length - 1; i >= 0; i--) {
            let t = tiros[i];
            t.y += t.s * (dt / 16);
            
            let colidiuComEscudoOrbital = false;
            if (faseAtual === 7 || (faseAtual > 7 && (faseAtual - 7) % 10 === 0)) {
                for (let e = 0; e < escudosOrbitais.length; e++) {
                    let esc = escudosOrbitais[e];
                    if (esc.vivo && checarColisao(t, esc)) {
                        colidiuComEscudoOrbital = true;
                        esc.hp -= t.isFireball ? 150 : 35;
                        explodir(t.x, t.y, '#c084fc');
                        if (esc.hp <= 0) {
                            esc.vivo = false;
                            explodir(esc.x + esc.w / 2, esc.y + esc.h / 2, '#a855f7');
                            aplicarTremor(8);
                        }
                        break;
                    }
                }
            }
            
            if (colidiuComEscudoOrbital) {
                tiros.splice(i, 1);
                continue;
            }
            
            if (t.y < -40) {
                tiros.splice(i, 1);
                continue;
            }
            
            for (let j = invasores.length - 1; j >= 0; j--) {
                let inv = invasores[j];
                if ((inv.vivo || inv.isBoss || inv.isShield) && checarColisao(t, inv)) {
                    tiros.splice(i, 1);
                    let dano = t.isFireball ? 200 : 40;
                    inv.hp -= dano;
                    
                    if (inv.isBoss || inv.isShield) {
                        explodir(t.x, t.y, '#00f6ff');
                        aplicarTremor(2);
                        
                        let bossReal = invasores.find(n => n.isBoss);
                        if (bossReal) {
                            let pct = Math.max(0, (bossReal.hp / bossReal.maxHp) * 100);
                            $('boss-hp-fill').style.width = pct + '%';
                        }
                        
                        if (inv.hp <= 0) {
                            if (inv.isShield) {
                                invasores.splice(j, 1);
                                aplicarTremor(10);
                            } else {
                                bossMorrendo = true;
                                tempoParado = false;
                                contadorTempo = 0;
                                $('efeito-tempo').style.opacity = '0';
                                aplicarTremor(25);
                                explodir(inv.x + inv.w / 2, inv.y + inv.h / 2, '#fff');
                                setTimeout(() => {
                                    invasores.splice(j, 1);
                                    faseAtual++;
                                    criarFase();
                                }, 1500);
                            }
                        }
                    } else {
                        inv.vivo = false;
                        player.kills++;
                        explodir(inv.x + inv.w / 2, inv.y + inv.h / 2, '#00ffaa');
                        aplicarTremor(4);
                        invasores.splice(j, 1);
                    }
                    break;
                }
            }
        }
        
        if (!tempoParado) {
            let descendoFase = false;
            invasores.forEach(inv => {
                if (inv.isShield) {
                    const boss = invasores.find(b => b.isBoss);
                    if (boss) {
                        inv.x = boss.x - 40;
                        inv.y = boss.y - 20;
                    }
                    return;
                }
                
                inv.x += inv.vel * inv.dir * (dt / 16);
                if (!inv.isBoss && (inv.x > 800 - inv.w - 10 || inv.x < 10)) {
                    inv.dir *= -1;
                    if (!inv.deSuporte) descendoFase = true;
                }
                
                if (inv.isBoss) {
                    if (inv.x > 800 - inv.w - 20 || inv.x < 20) inv.dir *= -1;
                    if (inv.tipo === 3) {
                        inv.timerInvocacao += dt;
                        if (inv.timerInvocacao >= 4000) {
                            inv.timerInvocacao = 0;
                            invasores.push({
                                x: inv.x + inv.w / 2 - 25,
                                y: inv.y + inv.h,
                                w: 50,
                                h: 50,
                                vivo: true,
                                dir: Math.random() > 0.5 ? 1 : -1,
                                vel: 2
                            });
                        }
                        if (inv.hp < inv.maxHp * 0.3 && !inv.usouCura) {
                            inv.usouCura = true;
                            inv.hp += 1200;
                            falar("O CRIADOR: Matriz de dados celular inteiramente regenerada!", 2000);
                            aplicarTremor(6);
                        }
                    }
                }
                
                if (Math.random() < 0.006 && !bossMorrendo) {
                    tirosE.push({ x: inv.x + inv.w / 2 - 3, y: inv.y + inv.h, w: 6, h: 15, s: inv.isBoss ? 5 : 4 });
                    somTiroInimigo.currentTime = 0;
                    somTiroInimigo.play().catch(() => {});
                }
            });
            
            if (descendoFase) {
                invasores.forEach(inv => {
                    if (!inv.isBoss && !inv.isShield && !inv.deSuporte) inv.y += 12;
                });
            }
        }
        
        for (let i = tirosE.length - 1; i >= 0; i--) {
            let te = tirosE[i];
            if (!tempoParado) te.y += te.s * (dt / 16);
            if (te.y > 620) {
                tirosE.splice(i, 1);
                continue;
            }
            
            if (checarColisao(te, player)) {
                tirosE.splice(i, 1);
                if (!player.escudoAtivo && player.danoTime <= 0) {
                    player.vidas--;
                    player.danoTime = 1200;
                    aplicarTremor(12);
                    if (player.vidas <= 0) finalizarJogo();
                }
                continue;
            }
        }
        
        const navesRestantes = invasores.filter(inv => !inv.isShield && !inv.isBoss);
        const chefeAtivo = invasores.find(inv => inv.isBoss);
        if (navesRestantes.length === 0 && !chefeAtivo && !bossMorrendo) {
            faseAtual++;
            criarFase();
        }
    }
    
    // CORREÇÃO ESSENCIAL: Loop de partículas usando 'continue;' para não quebrar a renderização caso alguma morra
    for (let i = particulas.length - 1; i >= 0; i--) {
        let p = particulas[i];
        if (!tempoParado) {
            p.x += p.vx * (dt / 16);
            p.y += p.vy * (dt / 16);
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.life -= dt / 16;
        }
        
        if (p.life <= 0) {
            particulas.splice(i, 1);
            continue; // <--- ADICIONADO AQUI! Pula o desenho para elementos excluídos sem quebrar o loop
        }
        
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    if (player.kills >= 3 && !avisandoHabilidade) {
        avisandoHabilidade = true;
        aplicarTremor(3);
    }
}

function draw() {
    ctx.clearRect(0, 0, 800, 600);
    ctx.save();
    
    if (tremorIntensidade > 0) {
        let dx = (Math.random() - 0.5) * tremorIntensidade;
        let dy = (Math.random() - 0.5) * tremorIntensidade;
        ctx.translate(dx, dy);
        tremorIntensidade *= 0.9 * (16 / (performance.now() - lastTime || 16));
        if (tremorIntensidade < 0.2) tremorIntensidade = 0;
    }
    
    ctx.fillStyle = '#030208';
    ctx.fillRect(0, 0, 800, 600);
    
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 25; i++) {
        let starY = (i * 32 + frameAnim * 0.6) % 600;
        ctx.fillRect((i * 47) % 800, starY, 2, 2);
    }
    
    if (modo === 'historia' || modo === 'jogando') {
        desenharNave(amigo, '#00ffaa', false);
        desenharNave(player, '#00f6ff', true);
        
        if (faseAtual === 7 || (faseAtual > 7 && (faseAtual - 7) % 10 === 0)) {
            escudosOrbitais.forEach(esc => {
                if (esc.vivo) {
                    ctx.save();
                    ctx.translate(esc.x + esc.w / 2, esc.y + esc.h / 2);
                    ctx.rotate(frameAnim * 0.08);
                    ctx.shadowColor = '#a855f7';
                    ctx.shadowBlur = 10;
                    
                    if (skins.escudo.complete && skins.escudo.naturalWidth !== 0) {
                        ctx.globalAlpha = 0.6;
                        ctx.drawImage(skins.escudo, -esc.w / 2, -esc.h / 2, esc.w, esc.h);
                    } else {
                        ctx.fillStyle = '#c084fc';
                        ctx.fillRect(-esc.w / 2, -esc.h / 2, esc.w, esc.h);
                    }
                    ctx.restore();
                }
            });
        }
        
        invasores.forEach(inv => {
            if (inv.isShield) desenharEscudoBoss(inv);
            else if (inv.isBoss) desenharBoss(inv);
            else desenharNave(inv, '#ff2a6d', false);
        });
        
        tiros.forEach(t => {
            if (t.isFireball) {
                desenharFireball(t);
            } else {
                ctx.save();
                ctx.fillStyle = '#00f6ff';
                ctx.shadowColor = '#00f6ff';
                ctx.shadowBlur = 8;
                ctx.fillRect(t.x, t.y, t.w, t.h);
                ctx.restore();
            }
        });
        
        tirosE.forEach(te => {
            ctx.save();
            ctx.fillStyle = '#ff2a6d';
            ctx.shadowColor = '#ff2a6d';
            ctx.shadowBlur = 6;
            ctx.fillRect(te.x, te.y, te.w, te.h);
            ctx.restore();
        });
        
        tirosTeleguiados.forEach(tt => {
            ctx.save();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
            ctx.beginPath();
            for (let r = 0; r < tt.rastro.length; r++) {
                if (r === 0) ctx.moveTo(tt.rastro[r].x, tt.rastro[r].y);
                else ctx.lineTo(tt.rastro[r].x, tt.rastro[r].y);
            }
            ctx.stroke();
            ctx.restore();
            
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
        
        if (tempoParado) {
            desenharRachadurasEspacoTempo();
            ctx.fillStyle = "rgba(168, 85, 247, 0.08)";
            ctx.fillRect(0, 0, 800, 600);
        }
        
        if (emDialogoFase7) {
            desenharIntroducaoBoss7();
        }
    }
    ctx.restore();
}

// MODIFICAÇÃO: Nova função adicionada para se comunicar e disparar sua div real do HTML
function finalizarJogo() {
    modo = 'gameover';
    $('fase-final').innerText = faseAtual; // Coloca a fase alcançada no seu HTML
    $('game-over').style.display = 'block'; // Mostra sua janela real de Game Over
}

function loop(currentTime) {
    let dt = currentTime - lastTime;
    if (dt > 100) dt = 16;
    lastTime = currentTime;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
