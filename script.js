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
    "Nexus Vortex: Ora, ora... Parece que temos um invasor persistente.",
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

// Física de balanço/inclinação para o Player
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

// Adiciona os botões virtuais para dispositivos móveis dinamicamente por código
function setupMobileControls() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Remove qualquer container anterior para não duplicar
    const antigo = document.getElementById('mobile-controls-container');
    if (antigo) antigo.remove();

    // Cria o container principal dos botões virtuais
    const container = document.createElement('div');
    container.id = 'mobile-controls-container';
    container.style.position = 'absolute';
    container.style.bottom = '20px';
    container.style.left = '5%';
    container.style.width = '90%';
    container.style.display = 'flex';
    container.style.justifyContent = 'space-between';
    container.style.alignItems = 'center';
    container.style.zIndex = '999999';
    container.style.userSelect = 'none';

    // Container Esquerdo (Direcionais)
    const dpad = document.createElement('div');
    dpad.style.display = 'flex';
    dpad.style.gap = '15px';

    const btnLeft = document.createElement('button');
    btnLeft.innerText = '◀';
    const btnRight = document.createElement('button');
    btnRight.innerText = '▶';

    // Container Direito (Ações)
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '12px';

    const btnShoot = document.createElement('button');
    btnShoot.innerText = 'TIRO';
    const btnFireball = document.createElement('button');
    btnFireball.innerText = 'B. FOGO (E)';
    const btnShield = document.createElement('button');
    btnShield.innerText = 'ESCUDO (R)';

    // Estilização geral dos botões
    const estilarBotao = (btn, width, bg) => {
        btn.style.width = width;
        btn.style.height = '60px';
        btn.style.fontSize = '18px';
        btn.style.fontWeight = 'bold';
        btn.style.fontFamily = "'Courier New', monospace";
        btn.style.backgroundColor = bg;
        btn.style.color = '#fff';
        btn.style.border = '2px solid rgba(255,255,255,0.4)';
        btn.style.borderRadius = '12px';
        btn.style.outline = 'none';
        btn.style.boxShadow = '0 6px 15px rgba(0,0,0,0.5)';
        btn.style.touchAction = 'manipulation';
        btn.style.webkitUserSelect = 'none';
    };

    estilarBotao(btnLeft, '70px', 'rgba(0, 210, 255, 0.45)');
    estilarBotao(btnRight, '70px', 'rgba(0, 210, 255, 0.45)');
    estilarBotao(btnShoot, '80px', 'rgba(0, 255, 136, 0.45)');
    estilarBotao(btnFireball, '95px', 'rgba(120, 120, 120, 0.3)'); // Começa cinza
    estilarBotao(btnShield, '95px', 'rgba(120, 120, 120, 0.3)');  // Começa cinza

    // Lógica física de Touch Eventos
    const linkKeys = (btn, keycode) => {
        btn.addEventListener('touchstart', e => { e.preventDefault(); keys[keycode] = true; });
        btn.addEventListener('touchend', e => { e.preventDefault(); keys[keycode] = false; });
    };

    linkKeys(btnLeft, 'KeyA');
    linkKeys(btnRight, 'KeyD');
    linkKeys(btnShoot, 'Space');

    // Botão de Especial Bola de Fogo (Mobile)
    btnFireball.addEventListener('touchstart', e => {
        e.preventDefault();
        if (emDialogoFase7) {
            indiceFraseFase7++;
            if (indiceFraseFase7 >= frasesFase7.length) emDialogoFase7 = false;
            return;
        }
        if(!tempoParado && modo === 'jogando' && !bossMorrendo) {
            if(player.kills >= 3){ 
                // CORRIGIDO: s: -9 para fazer a bola de fogo SUBIR no mobile
                tiros.push({ x: player.x + player.w/2 - 25, y: player.y - 20, w: 50, h: 50, s: -9, isFireball: true }); 
                player.kills -= 3; 
            }
        }
    });

    // Botão de Especial Escudo (Mobile)
    btnShield.addEventListener('touchstart', e => {
        e.preventDefault();
        if (emDialogoFase7) {
            indiceFraseFase7++;
            if (indiceFraseFase7 >= frasesFase7.length) emDialogoFase7 = false;
            return;
        }
        if(!tempoParado && modo === 'jogando' && !bossMorrendo) {
            if(player.kills >= 2 && !player.escudoAtivo){ 
                player.escudoAtivo = true; 
                player.escudoTimer = 2000; 
                player.kills -= 2; 
            }
        }
    });

    // Montando o layout na árvore DOM
    dpad.appendChild(btnLeft);
    dpad.appendChild(btnRight);
    actions.appendChild(btnShoot);
    actions.appendChild(btnFireball);
    actions.appendChild(btnShield);
    container.appendChild(dpad);
    container.appendChild(actions);

    // Adiciona o container logo após o canvas
    canvas.parentNode.insertBefore(container, canvas.nextSibling);

    // Loop de atualização visual do estado dos botões de Especial (cores acesas/apagadas)
    setInterval(() => {
        if(player.kills >= 3) {
            btnFireball.style.backgroundColor = 'rgba(255, 85, 0, 0.8)';
            btnFireball.style.borderColor = '#ff5500';
        } else {
            btnFireball.style.backgroundColor = 'rgba(120, 120, 120, 0.3)';
            btnFireball.style.borderColor = 'rgba(255,255,255,0.4)';
        }
        if(player.kills >= 2 && !player.escudoAtivo) {
            btnShield.style.backgroundColor = 'rgba(0, 210, 255, 0.8)';
            btnShield.style.borderColor = '#00d2ff';
        } else {
            btnShield.style.backgroundColor = 'rgba(120, 120, 120, 0.3)';
            btnShield.style.borderColor = 'rgba(255,255,255,0.4)';
        }
    }, 100);
}

// Inicializa controles mobile
setupMobileControls();

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
    ctx.fillText("Pressione [ESPAÇO], [ENTER] ou use especiais para continuar...", x + w - 340, y + h - 15);
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

// Controles e Habilidades (Suporte a Teclado PC)
window.addEventListener('keydown', e => {
    // Interações de diálogo na Fase 7 têm prioridade
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

    // Disparos e Habilidades pelo teclado (PC)
    if(!tempoParado && modo === 'jogando' && !bossMorrendo) {
        // CORRIGIDO: s: -9 para fazer a bola de fogo SUBIR no PC
        if(e.code === 'KeyE') { 
            if(player.kills >= 3){ 
                tiros.push({ x: player.x + player.w/2 - 25, y: player.y - 20, w: 50, h: 50, s: -9, isFireball: true }); 
                player.kills -= 3; 
            } 
        }
        if(e.code === 'KeyR') { 
            if(player.kills >= 2 && !player.escudoAtivo){ 
                player.escudoAtivo = true; 
                player.escudoTimer = 2000; 
                player.kills -= 2; 
            } 
        }
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
    const pulso = 1.0 + Math.sin(frameAnim * 0.08) * 0.05;
    ctx.rotate(frameAnim * 0.02);
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f6ff';
    ctx.strokeStyle = '#00f6ff';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0, 246, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, (obj.w/2) * pulso, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

// Detecção Física de Colisão AABB simples
function colide(r1, r2){
    const rw1 = r1.w || 6, rh1 = r1.h || 20;
    const rw2 = r2.w || 6, rh2 = r2.h || 20;
    return r1.x < r2.x + rw2 && r1.x + rw1 > r2.x && r1.y < r2.y + rh2 && r1.y + rh1 > r2.y;
}

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
        ctx.fillStyle = '#ffae3b'; ctx.beginPath();
        ctx.arc(0, 0, w/2, 0, Math.PI*2); ctx.fill(); 
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
        ctx.beginPath(); ctx.moveTo(x, y);
        const segmentos = 5;
        const comprimentoSegmento = 80 + (Math.sin(seed * i) * 20);
        for (let j = 0; j < segmentos; j++) {
            angulo += (Math.sin(seed + j + i) * 0.4) - 0.2;
            x += Math.cos(angulo) * comprimentoSegmento; y += Math.sin(angulo) * comprimentoSegmento; ctx.lineTo(x, y);
            if (j > 1 && Math.sin(seed + j) > 0) {
                ctx.save(); ctx.lineWidth = 1.2;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.beginPath(); ctx.moveTo(x, y); let anguloRamo = angulo + 0.8;
                ctx.lineTo(x + Math.cos(anguloRamo) * 40, y + Math.sin(anguloRamo) * 40); ctx.stroke(); ctx.restore();
            }
        }
        ctx.stroke();
    }
    ctx.restore();
}

// Loop Principal do Jogo (Física de DeltaTime e Render)
function gameLoop(now){
    let dt = now - lastTime;
    if(dt > 100) dt = 16; 
    lastTime = now;
    frameAnim += (dt/16);

    ctx.clearRect(0,0,800,600);
    ctx.save();
    if(tremorIntensidade > 0.1){
        const dx = (Math.random() - 0.5) * tremorIntensidade;
        const dy = (Math.random() - 0.5) * tremorIntensidade;
        ctx.translate(dx, dy);
        tremorIntensidade *= 0.88;
    }

    if(tempoParado) {
        ctx.fillStyle = '#0a0914'; ctx.fillRect(0,0,800,600);
        ctx.fillStyle = 'rgba(0, 246, 255, 0.08)'; ctx.fillRect(0,0,800,600);
        desenharRachadurasEspacoTempo();
    } else {
        ctx.fillStyle = '#030208'; ctx.fillRect(0,0,800,600);
        for(let i = 0; i < 40; i++){
            ctx.fillStyle = `rgba(255,255,255, ${0.1 + Math.sin(frameAnim * 0.02 + i) * 0.1})`;
            const y = (i * 37 + frameAnim * (1.5 + (i%3))) % 600;
            ctx.fillRect((i * 53) % 800, y, 2, 2);
        }
    }

    if(player.danoTime > 0) player.danoTime -= (dt/16);
    if(player.cooldown > 0) player.cooldown -= dt;
    if(player.escudoAtivo){
        player.escudoTimer -= dt;
        if(player.escudoTimer <= 0) player.escudoAtivo = false;
    }

    if(amigo.x > -100) { desenharNave(amigo, '#00d2ff', false); }
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
            boss.x = Math.max(50, Math.min(800 - boss.w - 50, boss.x));
        }

        // Ataques do Boss 7
        boss.ultimoTiro += dt;
        if(boss.ultimoTiro >= 1800) {
            boss.ultimoTiro = 0;
            if(Math.random() < 0.65) {
                // Tiros normais saindo das laterais do Boss
                tirosE.push({ x: boss.x + 20, y: boss.y + boss.h - 10, s: 4 });
                tirosE.push({ x: boss.x + boss.w - 20, y: boss.y + boss.h - 10, s: 4 });
                somTiroInimigo.currentTime = 0;
                somTiroInimigo.play().catch(o=>{});
            }
        }

        boss.ultimoBot += dt;
        if(boss.ultimoBot >= 3400) {
            boss.ultimoBot = 0;
            // Disparo Teleguiado Direcionado
            tirosTeleguiados.push({
                x: boss.x + boss.w / 2,
                y: boss.y + boss.h - 20,
                w: 16, h: 16, vel: 2.8,
                rastro: []
            });
            aplicarTremor(4);
            if(Math.random() < 0.5) {
                falar(falasNexus[Math.floor(Math.random() * falasNexus.length)], 2000);
            }
        }

        // Movimento orbital dos escudos protetores
        boss.anguloEscudos += 0.02 * (dt / 16);
        escudosOrbitais.forEach(esc => {
            if(esc.vivo) {
                const ang = boss.anguloEscudos + esc.anguloOffset;
                esc.x = (boss.x + boss.w / 2) + Math.cos(ang) * esc.raio - esc.w / 2;
                esc.y = (boss.y + boss.h / 2) + Math.sin(ang) * esc.raio - esc.h / 2;
                desenharEscudoBoss(esc);
            }
        });
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
        }
    }

    // Comportamento do Boss 3 (Criador de Mundos)
    if(boss && boss.tipo === 3 && !tempoParado && !bossMorrendo){
        boss.x += boss.vel * boss.dir * (dt/16);
        if (boss.x < 50 || boss.x > 800 - boss.w - 50) {
            boss.dir *= -1;
        }
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
    } else if(boss && boss.tipo === 1) { // Chefe Assassino Temporal (Tokitobashi)
        contadorTempo += dt;
        if(!tempoParado && contadorTempo >= 7500){
            tempoParado = true;
            contadorTempo = 0;
            somTempo.play();
            falar(falasChefe[Math.floor(Math.random()*falasChefe.length)], 2500, ()=>{ tempoParado = false; contadorTempo = 0; });
        }
        if(!tempoParado && Math.random() < 0.03 * (dt/16)){
            tirosE.push({ x: boss.x + boss.w/2 - 2, y: boss.y + boss.h, s: 4.5 });
            somTiroInimigo.currentTime = 0;
            somTiroInimigo.play().catch(o=>{});
        }
    } else { // Invasores Comuns Atirando
        invasores.forEach(inv => {
            if(!inv.isBoss && !inv.isShield && inv.vivo && Math.random() < 0.00065 * (dt/16)){
                tirosE.push({ x: inv.x + inv.w/2, y: inv.y + inv.h, s: 4 });
                somTiroInimigo.currentTime = 0;
                somTiroInimigo.play().catch(o=>{});
            }
        });
    }

    // Movimento contínuo do Player no PC (segurando teclas)
    if (!emDialogoFase7 && modo === 'jogando' && !bossMorrendo) {
        if (keys['ArrowLeft'] || keys['KeyA']) {
            player.tx = Math.max(0, player.tx - 8 * (dt / 16));
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            player.tx = Math.min(800 - player.w, player.tx + 8 * (dt / 16));
        }
    }

    // Interpolação de posição física suave (Lerp)
    const lerp = 1 - Math.pow(0.001, dt/1000);
    player.x += (player.tx - player.x) * lerp;

    // Disparos automáticos se a tecla Espaço estiver segurada (PC)
    if (!emDialogoFase7 && !bossMorrendo && keys['Space'] && player.cooldown <= 0) {
        tiros.push({ x: player.x + player.w/2 - 3, y: player.y - 15, w: 6, h: 18, s: -7 });
        player.cooldown = 200;
        somTiroPlayer.currentTime = 0;
        somTiroPlayer.play().catch(o=>{});
    }

    // Movimentação física dos invasores comuns
    if(!tempoParado && !bossMorrendo && !emDialogoFase7){
        let bateuBorda = false;
        invasores.forEach(inv => {
            if(!inv.isBoss && !inv.isShield && inv.vivo){
                inv.x += inv.vel * inv.dir * (dt/16);
                if(inv.x < 10 || inv.x > 800 - inv.w - 10) bateuBorda = true;
            }
        });
        if(bateuBorda){
            invasores.forEach(inv => {
                if(!inv.isBoss && !inv.isShield){
                    inv.dir *= -1;
                    inv.y += 25;
                    inv.x = Math.max(10, Math.min(800-inv.w-10, inv.x));
                    if(inv.y + inv.h >= player.y && inv.vivo){
                        player.vidas = 0;
                    }
                }
            });
        }
    }

    // Movimentação e física dos Tiros do Jogador
    for(let tIdx = tiros.length - 1; tIdx >= 0; tIdx--){
        let t = tiros[tIdx];
        t.y += t.s * (dt/16); // Move o projétil usando seu parâmetro de velocidade s (-9 para subir)
        
        if(t.y < -50 || t.y > 650 || t.destruido){
            tiros.splice(tIdx, 1);
            continue;
        }

        let consumed = false;

        // Colisão física contra escudos orbitais do Boss 7
        if (escudosOrbitais.length > 0) {
            for(let esc of escudosOrbitais) {
                if(esc.vivo && colide(t, esc)) {
                    esc.hp -= t.isFireball ? 50 : 25;
                    explodir(t.x, t.y, '#00f6ff');
                    aplicarTremor(2);
                    if(esc.hp <= 0) {
                        esc.vivo = false;
                        explodir(esc.x + esc.w/2, esc.y + esc.h/2, '#00f6ff');
                        aplicarTremor(10);
                        falar("Nexus: Um dos meus escudos colapsou!", 2000);
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
                if(inv.isBoss && inv.tipo === 2 && shield) {
                    explodir(t.x, t.y, '#666');
                    consumed = true;
                    break;
                }
                if(inv.isBoss || inv.isShield || inv.isBlocoProtetor){
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

    // Colisão Física dos Tiros Inimigos contra o Jogador (Não andam no Tokitobashi)
    if(!tempoParado){
        for(let teIdx = tirosE.length - 1; teIdx >= 0; teIdx--){
            let te = tirosE[teIdx];
            te.y += te.s * (dt/16);
            if(te.y > 650){
                tirosE.splice(teIdx, 1);
                continue;
            }
            if(colide(te, player)){
                tirosE.splice(teIdx, 1);
                if(!player.escudoAtivo && player.danoTime <= 0){
                    player.vidas--;
                    player.danoTime = 60; // Imunidade curta
                    aplicarTremor(12);
                    explodir(player.x + player.w/2, player.y + player.h/2, '#ff0055');
                } else if(player.escudoAtivo){
                    explodir(te.x, te.y, '#00d2ff');
                    aplicarTremor(3);
                }
            }
        }
    }

    // Game Over Check
    if(player.vidas <= 0){
        somMenu.pause();
        alert("GAME OVER! A humanidade caiu...");
        modo = 'menu';
        faseAtual = 1;
        player.vidas = 3;
        player.kills = 0;
        $('game-container').style.display = 'none';
        $('menu-principal').style.display = 'block';
        ctx.restore();
        return;
    }

    // Vitória total da fase (sem invasores vivos e sem chefe ativo)
    const invasoresRestantes = invasores.filter(i => !i.isBoss && !i.isShield && i.vivo);
    if(invasoresRestantes.length === 0 && !boss && !bossMorrendo){
        faseAtual++;
        criarFase();
    }

    // Renderização Visual de Invasores e Objetos ativos
    invasores.forEach(inv => {
        if(inv.isBoss){
            desenharBoss(inv);
        } else if(inv.isShield){
            ctx.save(); ctx.translate(inv.x + inv.w/2, inv.y + inv.h/2);
            ctx.strokeStyle = '#00d2ff'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(0, 210, 255, 0.1)';
            ctx.strokeRect(-inv.w/2, -inv.h/2, inv.w, inv.h); ctx.fillRect(-inv.w/2, -inv.h/2, inv.w, inv.h);
            ctx.restore();
        } else if(inv.vivo){
            desenharNave(inv, '#ff0055', false);
        }
    });

    if(boss && boss.tipo === 4){
        escudosOrbitais.forEach(esc => {
            if(esc.vivo) {
                ctx.fillStyle = "rgba(0,0,0,0.5)";
                ctx.fillRect(esc.x, esc.y - 8, esc.w, 4);
                ctx.fillStyle = "#00f6ff";
                ctx.fillRect(esc.x, esc.y - 8, esc.w * (esc.hp / esc.maxHp), 4);
            }
        });
    }

    // Barra de Vida Física dos Chefes na Interface Superior
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

    // Tiros Teleguiados do Boss 7 (Nexus Vortex)
    tirosTeleguiados.forEach(tt => {
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

    if (emDialogoFase7) {
        desenharIntroducaoBoss7();
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// Inicia o Game Loop Principal
requestAnimationFrame(gameLoop);
