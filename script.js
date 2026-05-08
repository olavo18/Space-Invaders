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
skins.nexusVortex.src = 'nexus-vortex.png';

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

let audioPermitido = false;

window.permitirAudio = function() {
    audioPermitido = true;
    somMenu.play().catch(e => console.log("Áudio aguardando interação do usuário."));
    $('overlay-start').style.opacity = '0';
    setTimeout(() => {
        $('overlay-start').style.display = 'none';
        $('menu-principal').style.display = 'block';
    }, 500);
};

// Estados Globais de Jogo
let modo = 'menu'; // 'menu', 'historia', 'jogando', 'gameover'
let fase = 1;
let frameAnim = 0;
let tempoUltimoQuadro = performance.now();

// Entidades de Gameplay
const player = {
    x: 400, y: 520, w: 54, h: 54, tx: 400,
    vidas: 3, maxVidas: 3,
    kills: 0, tiros: [], recargaTiro: 0,
    escudosRestantes: 2, escudoAtivo: false, tempoEscudo: 0,
    especiaisRestantes: 3, especialAtivo: false, especialX: 0, especialY: 0
};

const amigo = { x: -150, y: 520, w: 50, h: 50, tx: -150, velX: 0 };

let aliens = [];
let tirosInimigos = [];
let tirosTeleguiados = [];
let particulas = [];

// Definição das Propriedades dos Chefes
let chefeAtivo = false;
let boss = null;

// Efeito de Parada Temporal "Tokitobashi" (Chefe 5)
let tempoParado = false;
let cronometroTempoParado = 0;
let cooldownParadaTempo = 7500; // A cada 7.5 segundos
let timerProximaParada = 7500;
let avisandoHabilidade = false;

// Estado do Chefe Fase 7 (Nexus Vortex)
let emDialogoFase7 = false;
let dialogoFase7Timer = 0;
let escudosBoss7 = [];

// Configurações de Tremor de Tela
let intensidadeTremor = 0;

function aplicarTremor(forca) {
    intensidadeTremor = forca;
}

// Controles Teclado
const teclado = {};
window.addEventListener('keydown', e => {
    teclado[e.code] = true;
    if (modo === 'jogando') {
        if ((e.code === 'KeyE' || e.code === 'KeyQ') && player.kills >= 3 && player.especiaisRestantes > 0 && !player.especialAtivo) {
            dispararEspecial();
        }
        if (e.code === 'KeyR' && player.escudosRestantes > 0 && !player.escudoAtivo) {
            ativarEscudo();
        }
    }
});
window.addEventListener('keyup', e => teclado[e.code] = false);

// Diálogos Cinemáticos
function falar(texto, duracao, callback) {
    const box = $('dialogo-box');
    box.innerText = texto;
    box.classList.add('show');
    setTimeout(() => {
        box.classList.remove('show');
        if (callback) callback();
    }, duracao);
}

// Habilidades Especiais do Jogador
function dispararEspecial() {
    player.especialAtivo = true;
    player.especiaisRestantes--;
    player.kills = 0;
    avisandoHabilidade = false;
    player.especialX = player.x + player.w / 2;
    player.especialY = player.y;
    aplicarTremor(12);
}

function ativarEscudo() {
    player.escudoAtivo = true;
    player.escudosRestantes--;
    player.tempoEscudo = 2000; // 2 segundos
}

// Inicializadores de Menu e Dossiê
window.abrirGuiaBosses = function() {
    $('guia-bosses-painel').classList.add('show');
};
window.fecharGuiaBosses = function() {
    $('guia-bosses-painel').classList.remove('show');
};

window.iniciarHistoria = function() {
    if (audioPermitido) {
        somMenu.pause();
    }
    $('menu-principal').style.display = 'none';
    $('game-container').style.display = 'block';
    modo = 'historia';
    
    amigo.tx = 300;
    player.tx = 460;
    
    falar("Hunter: Eu consigo derrotar esses alienígenas sozinho!", 2200, () => {
        falar("Amigo: Hunter, você enlouqueceu? São muitos!", 2200, () => {
            falar("Hunter: Vou mostrar do que sou capaz!", 1500, () => {
                modo = 'jogando';
                player.tx = 400;
                amigo.tx = 330; 
                criarFase();
            });
        });
    });
};

// Geração de Fase e Inimigos
function criarFase() {
    aliens = [];
    tirosInimigos = [];
    tirosTeleguiados = [];
    chefeAtivo = false;
    boss = null;
    escudosBoss7 = [];
    tempoParado = false;
    timerProximaParada = 7500;
    
    $('fase-txt').innerText = fase;
    $('hab-txt').innerText = player.especiaisRestantes;
    $('escudo-txt').innerText = player.escudosRestantes;
    $('vidas-txt').innerText = player.vidas;

    // Desliga UI de vida do Boss por padrão
    $('boss-hp-bar').style.display = 'none';
    $('boss-hp-label').style.display = 'none';

    // Fases de Chefe (A cada 5 fases)
    if (fase % 5 === 0) {
        chefeAtivo = true;
        let tipoChefe = (fase / 5) % 3; // Rotaciona os tipos de chefes criados

        boss = {
            x: 350, y: -150, w: 100, h: 80,
            vidaMax: 100 + (fase * 20),
            vida: 100 + (fase * 20),
            velX: 2.5,
            recargaAtalho: 0,
            tipo: tipoChefe, // 1: Chefe Supremo (Tempo), 2: MK-II (Anulador), 0: Criador de Mundos
            faseOrigem: fase,
            faseRecuperouVida: false
        };

        // Customização de nome visual para a barra do Boss
        let nomeBoss = "CHEFE SUPREMO";
        if (tipoChefe === 2) nomeBoss = "MK-II: O ANULADOR";
        if (tipoChefe === 0) nomeBoss = "O CRIADOR DE MUNDOS";
        
        $('boss-hp-label').innerText = nomeBoss;
        $('boss-hp-bar').style.display = 'block';
        $('boss-hp-label').style.display = 'block';
        
    } else if (fase === 7) {
        // Fase Especial 7: Introduz o Boss Nexus Vortex
        chefeAtivo = true;
        emDialogoFase7 = true;
        dialogoFase7Timer = 4000; // Tempo de diálogo introdutório na tela
        
        boss = {
            x: 350, y: -150, w: 120, h: 90,
            vidaMax: 200,
            vida: 200,
            velX: 2,
            recargaAtalho: 0,
            tipo: 7, // Tipo exclusivo para o Nexus Vortex
            faseOrigem: 7
        };

        // Escudos Rotativos Orbitais do Boss 7
        escudosBoss7 = [
            { angulo: 0, raio: 90, w: 30, h: 30, ativo: true },
            { angulo: Math.PI, raio: 90, w: 30, h: 30, ativo: true }
        ];

        $('boss-hp-label').innerText = "NEXUS VORTEX";
        $('boss-hp-bar').style.display = 'block';
        $('boss-hp-label').style.display = 'block';

    } else {
        // Ondas normais de inimigos
        let linhas = 3 + Math.floor(fase / 3);
        let colunas = 8;
        for (let l = 0; l < linhas; l++) {
            for (let c = 0; c < colunas; c++) {
                aliens.push({
                    x: 80 + c * 80,
                    y: 60 + l * 50,
                    w: 40, h: 30,
                    velX: 1 + (fase * 0.15),
                    dir: 1,
                    atirarCooldown: Math.random() * 2000 + 1000
                });
            }
        }
    }
}

// Criação de Partículas para Explosões Neons
function criarExplosao(x, y, cor, quant = 12) {
    for (let i = 0; i < quant; i++) {
        let angulo = Math.random() * Math.PI * 2;
        let velocidade = Math.random() * 4 + 2;
        particulas.push({
            x: x, y: y,
            vx: Math.cos(angulo) * velocidade,
            vy: Math.sin(angulo) * velocidade,
            size: Math.random() * 4 + 2,
            color: cor,
            life: 30 + Math.random() * 20,
            maxLife: 50
        });
    }
}

// Renderizador com Efeito Neon de Desenho das Naves
function desenharNave(ent, corSombra, ehPlayer = false) {
    ctx.save();
    ctx.shadowColor = corSombra;
    ctx.shadowBlur = 15;
    
    let img = skins.alien;
    if (ehPlayer) img = skins.player;
    else if (ent === amigo) img = skins.amigo;

    if (img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, ent.x, ent.y, ent.w, ent.h);
    } else {
        // Fallback geométrico caso imagens falhem no carregamento
        ctx.fillStyle = corSombra;
        ctx.beginPath();
        if (ehPlayer) {
            ctx.moveTo(ent.x + ent.w / 2, ent.y);
            ctx.lineTo(ent.x, ent.y + ent.h);
            ctx.lineTo(ent.x + ent.w, ent.y + ent.h);
        } else {
            ctx.rect(ent.x, ent.y, ent.w, ent.h);
        }
        ctx.fill();
    }
    ctx.restore();
}

function desenharRachadurasEspacoTempo() {
    ctx.save();
    ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 50); ctx.lineTo(150, 150); ctx.lineTo(120, 250);
    ctx.moveTo(700, 100); ctx.lineTo(650, 220); ctx.lineTo(680, 340);
    ctx.moveTo(350, 450); ctx.lineTo(450, 490); ctx.lineTo(410, 550);
    ctx.stroke();
    ctx.restore();
}

function desenharIntroducaoBoss7() {
    ctx.save();
    ctx.font = "bold 20px 'Orbitron', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 10;
    ctx.textAlign = "center";
    ctx.fillText("ALERTA: ANOMALIA DE GRAVIDADE DETECTADA", 400, 180);
    ctx.font = "14px 'Orbitron', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText("O Nexus Vortex está manipulando a malha do espaço!", 400, 210);
    ctx.restore();
}

// Loop Principal de Atualização Física e Desenho (GameLoop)
function gameLoop(agora) {
    let dt = agora - tempoUltimoQuadro;
    if (dt > 100) dt = 16; // Previne saltos bruscos se o jogo for minimizado
    tempoUltimoQuadro = agora;
    frameAnim++;

    ctx.clearRect(0, 0, 800, 600);

    // Configuração de tremor na tela (Screen Shake)
    ctx.save();
    if (intensidadeTremor > 0.1) {
        let dx = (Math.random() - 0.5) * intensidadeTremor;
        let dy = (Math.random() - 0.5) * intensidadeTremor;
        ctx.translate(dx, dy);
        intensidadeTremor *= 0.9; // Decaimento do tremor
    }

    if (modo === 'jogando' || modo === 'historia') {
        
        // Movimentação do Jogador
        if (modo === 'jogando' && !tempoParado) {
            if (teclado['ArrowLeft'] || teclado['KeyA']) player.tx -= 6.5 * (dt / 16);
            if (teclado['ArrowRight'] || teclado['KeyD']) player.tx += 6.5 * (dt / 16);
            player.tx = Math.max(10, Math.min(800 - player.w - 10, player.tx));
        }
        player.x += (player.tx - player.x) * 0.15;

        // Atualização e Interpolação física do Amigo
        if (modo === 'jogando') {
            amigo.tx = player.x - 70; // Mantém-se de forma fixa ao lado esquerdo da sua nave
            amigo.y = player.y;
        }
        amigo.x += (amigo.tx - amigo.x) * 0.1;

        // Renderiza o Amigo se ele estiver ativo em cena
        if (amigo.x > -80) {
            desenharNave(amigo, '#00d2ff', false);
        }

        // Renderiza o Jogador principal
        desenharNave(player, '#00ff88', true);

        // Gerenciador de Recarga do Disparo do Jogador
        if (player.recargaTiro > 0) player.recargaTiro -= dt;
        if (modo === 'jogando' && teclado['Space'] && player.recargaTiro <= 0 && !tempoParado) {
            player.tiros.push({ x: player.x + player.w / 2 - 2, y: player.y, vy: -9 });
            player.recargaTiro = 280; // Tempo de recarga do tiro normal
            if (audioPermitido) {
                somTiroPlayer.currentTime = 0;
                somTiroPlayer.play();
            }
        }

        // Redução do Tempo do Escudo
        if (player.escudoAtivo) {
            player.tempoEscudo -= dt;
            if (player.tempoEscudo <= 0) player.escudoAtivo = false;
            
            // Desenho do Escudo Protetor Neon
            ctx.save();
            ctx.shadowColor = '#00d2ff';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 45, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 210, 255, 0.1)';
            ctx.fill();
            ctx.restore();
        }

        // Atualização dos Tiros do Jogador
        for (let i = player.tiros.length - 1; i >= 0; i--) {
            let t = player.tiros[i];
            if (!tempoParado) t.y += t.vy * (dt / 16);
            
            if (t.y < -10) {
                player.tiros.splice(i, 1);
                continue;
            }

            // Desenha tiro do jogador
            ctx.save();
            ctx.fillStyle = '#00ff88';
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 8;
            ctx.fillRect(t.x, t.y, 4, 12);
            ctx.restore();
        }

        // Atualização do Especial de Bola de Fogo
        if (player.especialAtivo) {
            player.especialY -= 5.5 * (dt / 16);
            
            // Desenho animado da Bola de Fogo Neon
            ctx.save();
            ctx.shadowColor = '#ff3c00';
            ctx.shadowBlur = 25;
            if (skins.fireball.complete && skins.fireball.naturalWidth !== 0) {
                ctx.drawImage(skins.fireball, player.especialX - 35, player.especialY - 35, 70, 70);
            } else {
                ctx.fillStyle = '#ff5500';
                ctx.beginPath();
                ctx.arc(player.especialX, player.especialY, 25, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            if (player.especialY < -50) {
                player.especialAtivo = false;
            }
        }

        // Controle da Habilidade de Parada Temporal "Tokitobashi" (Chefe nível 5)
        if (chefeAtivo && boss && boss.tipo === 1) {
            if (!tempoParado) {
                timerProximaParada -= dt;
                if (timerProximaParada <= 0) {
                    tempoParado = true;
                    cronometroTempoParado = 2500; // Tempo paralisado por 2.5 segundos
                    if (audioPermitido) somTempo.play();
                    $('efeito-tempo').style.display = 'block';
                    falar("CHEFÃO: Tokitobashi! O tempo está sob meu domínio!", 2000);
                    aplicarTremor(15);
                }
            } else {
                cronometroTempoParado -= dt;
                if (cronometroTempoParado <= 0) {
                    tempoParado = false;
                    timerProximaParada = cooldownParadaTempo;
                    $('efeito-tempo').style.display = 'none';
                }
            }
        }

        // ==========================================
        // ATUALIZAÇÃO DOS ALIENS NORMAIS
        // ==========================================
        if (!chefeAtivo) {
            let inverterFronteira = false;
            aliens.forEach(al => {
                if (!tempoParado) {
                    al.x += al.velX * al.dir * (dt / 16);
                    if (al.x > 800 - al.w - 10 || al.x < 10) {
                        inverterFronteira = true;
                    }
                }
                
                // Desenhar Inimigo Comum
                desenharNave(al, '#ff0055');

                // Lógica de Disparo dos Aliens Normais
                if (!tempoParado && modo === 'jogando') {
                    al.atirarCooldown -= dt;
                    if (al.atirarCooldown <= 0) {
                        tirosInimigos.push({ x: al.x + al.w / 2 - 2, y: al.y + al.h, vy: 4 });
                        al.atirarCooldown = Math.random() * 3000 + 1500; // Reseta recarga aleatória
                        if (audioPermitido) {
                            somTiroInimigo.currentTime = 0;
                            somTiroInimigo.play();
                        }
                    }
                }
            });

            if (inverterFronteira && !tempoParado) {
                aliens.forEach(al => {
                    al.dir *= -1;
                    al.y += 15; // Desce degrau orbital
                });
            }

            // Colisão: Tiros normais do Jogador contra Aliens Comuns
            for (let i = player.tiros.length - 1; i >= 0; i--) {
                let t = player.tiros[i];
                for (let j = aliens.length - 1; j >= 0; j--) {
                    let al = aliens[j];
                    if (t.x > al.x && t.x < al.x + al.w && t.y > al.y && t.y < al.y + al.h) {
                        criarExplosao(al.x + al.w / 2, al.y + al.h / 2, '#ff0055');
                        aliens.splice(j, 1);
                        player.tiros.splice(i, 1);
                        player.kills++;
                        aplicarTremor(4);
                        break;
                    }
                }
            }

            // Colisão: Especial de Bola de Fogo contra Aliens Comuns (Perfura todos)
            if (player.especialAtivo) {
                for (let j = aliens.length - 1; j >= 0; j--) {
                    let al = aliens[j];
                    if (player.especialX + 25 > al.x && player.especialX - 25 < al.x + al.w &&
                        player.especialY + 25 > al.y && player.especialY - 25 < al.y + al.h) {
                        criarExplosao(al.x + al.w / 2, al.y + al.h / 2, '#ffaa00', 16);
                        aliens.splice(j, 1);
                        player.kills++;
                        aplicarTremor(6);
                    }
                }
            }

            // Condição de Vitória da Fase Comum
            if (aliens.length === 0 && modo === 'jogando') {
                fase++;
                criarFase();
            }
        }

        // ==========================================
        // ATUALIZAÇÃO DO CHEFE (BOSS) ATIVO
        // ==========================================
        if (chefeAtivo && boss) {
            
            // Diálogo introdutório do Boss 7
            if (emDialogoFase7) {
                dialogoFase7Timer -= dt;
                if (dialogoFase7Timer <= 0) {
                    emDialogoFase7 = false;
                }
            }

            // Descida e entrada triunfal do Chefe na arena
            if (boss.y < 80) {
                boss.y += 2 * (dt / 16);
            } else if (!tempoParado && !emDialogoFase7) {
                // Movimentação lateral oscilante correta do Boss
                boss.x += boss.velX * (dt / 16);
                if (boss.x > 800 - boss.w - 15 || boss.x < 15) {
                    boss.velX *= -1;
                }
            }

            // Renderiza Imagem / Skin do Chefe
            ctx.save();
            ctx.shadowBlur = 20;
            let corSombraBoss = '#ffae3b';
            let imgBoss = skins.chefe;

            if (boss.tipo === 1) {
                corSombraBoss = '#ff0055';
                imgBoss = skins.chefe2;
            } else if (boss.tipo === 0) {
                corSombraBoss = '#00d2ff';
                imgBoss = skins.criador;
            } else if (boss.tipo === 7) {
                corSombraBoss = '#a855f7';
                imgBoss = skins.nexusVortex;
            }

            ctx.shadowColor = corSombraBoss;
            if (imgBoss.complete && imgBoss.naturalWidth !== 0) {
                ctx.drawImage(imgBoss, boss.x, boss.y, boss.w, boss.h);
            } else {
                ctx.fillStyle = corSombraBoss;
                ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
            }
            ctx.restore();

            // Lógicas específicas de cada IA de Chefe
            if (!tempoParado && boss.y >= 80 && modo === 'jogando' && !emDialogoFase7) {
                boss.recargaAtalho -= dt;
                if (boss.recargaAtalho <= 0) {
                    
                    if (boss.tipo === 1) {
                        // Chefe Supremo: Atira rajadas alternadas de 3 tiros
                        tirosInimigos.push({ x: boss.x + 20, y: boss.y + boss.h, vy: 5 });
                        tirosInimigos.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h, vy: 5.5 });
                        tirosInimigos.push({ x: boss.x + boss.w - 20, y: boss.y + boss.h, vy: 5 });
                        boss.recargaAtalho = 1200;

                    } else if (boss.tipo === 2) {
                        // MK-II Anulador: Esquiva lateral rápida ao detectar tiros do jogador vindo em sua direção
                        let tiroAproximando = player.tiros.some(t => t.x > boss.x - 20 && t.x < boss.x + boss.w + 20 && t.y > boss.y && t.y < boss.y + 200);
                        if (tiroAproximando && Math.random() < 0.6) {
                            boss.x += (boss.velX > 0 ? 60 : -60);
                            boss.x = Math.max(20, Math.min(800 - boss.w - 20, boss.x));
                            criarExplosao(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ffae3b', 4);
                        }
                        
                        // Atira dois lasers direcionais lentos
                        tirosInimigos.push({ x: boss.x + 15, y: boss.y + boss.h, vy: 4.5 });
                        tirosInimigos.push({ x: boss.x + boss.w - 15, y: boss.y + boss.h, vy: 4.5 });
                        boss.recargaAtalho = 1500;

                    } else if (boss.tipo === 0) {
                        // O Criador de Mundos: Reconstroi matéria invocando 2 capangas nas laterais
                        if (aliens.length < 4 && Math.random() < 0.4) {
                            aliens.push({
                                x: boss.x - 50, y: boss.y + 20, w: 32, h: 24, velX: 1.5, dir: -1, atirarCooldown: 1000
                            });
                            aliens.push({
                                x: boss.x + boss.w + 10, y: boss.y + 20, w: 32, h: 24, velX: 1.5, dir: 1, atirarCooldown: 1500
                            });
                            criarExplosao(boss.x, boss.y + 20, '#00d2ff', 6);
                        }

                        // Recupera 25% de vida uma única vez quando estiver à beira da morte (<25% HP)
                        if (boss.vida < boss.vidaMax * 0.25 && !boss.faseRecuperouVida) {
                            boss.vida += boss.vidaMax * 0.35; // Cura emergencial de 35% de HP
                            boss.faseRecuperouVida = true;
                            falar("CRIADOR: Protocolo de autoreparação ativado!", 2000);
                            criarExplosao(boss.x + boss.w / 2, boss.y + boss.h / 2, '#00ff88', 25);
                        }

                        tirosInimigos.push({ x: boss.x + boss.w / 2 - 2, y: boss.y + boss.h, vy: 5 });
                        boss.recargaAtalho = 1800;

                    } else if (boss.tipo === 7) {
                        // Boss 7 Nexus Vortex: Atira projéteis roxos teleguiados perseguidores
                        if (tirosTeleguiados.length < 2) {
                            tirosTeleguiados.push({
                                x: boss.x + boss.w / 2,
                                y: boss.y + boss.h,
                                vx: 0, vy: 2,
                                rastro: []
                            });
                        }
                        // Disparo laser frontal de suporte
                        tirosInimigos.push({ x: boss.x + 20, y: boss.y + boss.h, vy: 6 });
                        tirosInimigos.push({ x: boss.x + boss.w - 20, y: boss.y + boss.h, vy: 6 });
                        boss.recargaAtalho = 2000;
                    }
                    
                    if (audioPermitido) {
                        somTiroInimigo.currentTime = 0;
                        somTiroInimigo.play();
                    }
                }
            }

            // Atualização e física dos Escudos Rotativos do Boss 7
            if (boss.tipo === 7) {
                escudosBoss7.forEach(es => {
                    if (es.ativo) {
                        es.angulo += 0.04; // Velocidade de rotação
                        es.x = (boss.x + boss.w / 2) + Math.cos(es.angulo) * es.raio - es.w / 2;
                        es.y = (boss.y + boss.h / 2) + Math.sin(es.angulo) * es.raio - es.h / 2;

                        // Desenha o Escudo Orbital
                        ctx.save();
                        ctx.shadowColor = '#00d2ff';
                        ctx.shadowBlur = 10;
                        ctx.strokeStyle = '#00d2ff';
                        ctx.lineWidth = 2;
                        ctx.fillStyle = 'rgba(0, 210, 255, 0.2)';
                        ctx.beginPath();
                        ctx.arc(es.x + es.w / 2, es.y + es.h / 2, es.w / 2, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.fill();
                        ctx.restore();
                    }
                });
            }

            // Atualização da Barra Visual de Vida do Chefe
            let percentualVida = Math.max(0, boss.vida / boss.vidaMax) * 100;
            $('boss-hp-fill').style.width = percentualVida + '%';

            // ==========================================
            // COLISÕES CONTRA O CHEFE (BOSS)
            // ==========================================
            
            // Colisão: Tiros normais do jogador contra os Escudos Orbitais (Boss 7) ou contra o corpo do Chefe
            for (let i = player.tiros.length - 1; i >= 0; i--) {
                let t = player.tiros[i];
                let tiroAbatido = false;

                // Primeiro verifica se colide com escudos ativos do Boss 7
                if (boss.tipo === 7) {
                    for (let es of escudosBoss7) {
                        if (es.ativo && t.x > es.x && t.x < es.x + es.w && t.y > es.y && t.y < es.y + es.h) {
                            criarExplosao(t.x, t.y, '#00d2ff', 5);
                            player.tiros.splice(i, 1);
                            tiroAbatido = true;
                            aplicarTremor(2);
                            break;
                        }
                    }
                }

                if (tiroAbatido) continue;

                // Verifica colisão direta com o corpo do Chefe
                if (t.x > boss.x && t.x < boss.x + boss.w && t.y > boss.y && t.y < boss.y + boss.h) {
                    boss.vida -= 10; // Causa dano no Chefe
                    criarExplosao(t.x, t.y, corSombraBoss, 6);
                    player.tiros.splice(i, 1);
                    aplicarTremor(5);

                    // Morte do Chefe
                    if (boss.vida <= 0) {
                        criarExplosao(boss.x + boss.w / 2, boss.y + boss.h / 2, corSombraBoss, 40);
                        chefeAtivo = false;
                        boss = null;
                        aplicarTremor(20);
                        fase++;
                        criarFase();
                    }
                }
            }

            // Colisão: Especial de Bola de Fogo contra o Chefe (Dano massivo)
            if (player.especialAtivo && boss) {
                let colidiuEspecial = false;
                
                // Bola de fogo quebra escudos orbitais imediatamente
                if (boss.tipo === 7) {
                    escudosBoss7.forEach(es => {
                        if (es.ativo && player.especialX + 25 > es.x && player.especialX - 25 < es.x + es.w &&
                            player.especialY + 25 > es.y && player.especialY - 25 < es.y + es.h) {
                            es.ativo = false;
                            criarExplosao(es.x + es.w / 2, es.y + es.h / 2, '#00d2ff', 20);
                        }
                    });
                }

                if (player.especialX + 25 > boss.x && player.especialX - 25 < boss.x + boss.w &&
                    player.especialY + 25 > boss.y && player.especialY - 25 < boss.y + boss.h) {
                    
                    boss.vida -= 40; // Super dano
                    criarExplosao(player.especialX, player.especialY, '#ff3c00', 30);
                    player.especialAtivo = false; // Consome o projétil do especial
                    aplicarTremor(15);

                    if (boss.vida <= 0) {
                        criarExplosao(boss.x + boss.w / 2, boss.y + boss.h / 2, corSombraBoss, 40);
                        chefeAtivo = false;
                        boss = null;
                        aplicarTremor(25);
                        fase++;
                        criarFase();
                    }
                }
            }
        }

        // ==========================================
        // PROCESSAMENTO DE PROJÉTEIS INIMIGOS
        // ==========================================
        
        // 1. Tiros Convencionais dos Inimigos
        for (let i = tirosInimigos.length - 1; i >= 0; i--) {
            let t = tirosInimigos[i];
            t.y += t.vy * (dt / 16);

            if (t.y > 610) {
                tirosInimigos.splice(i, 1);
                continue;
            }

            // Desenho do Projétil Inimigo Neon
            ctx.save();
            ctx.fillStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 8;
            ctx.fillRect(t.x, t.y, 4, 10);
            ctx.restore();

            // Colisão com a nave do Player
            if (t.x > player.x && t.x < player.x + player.w && t.y > player.y && t.y < player.y + player.h) {
                tirosInimigos.splice(i, 1);
                
                if (player.escudoAtivo) {
                    criarExplosao(t.x, t.y, '#00d2ff', 8);
                    aplicarTremor(3);
                } else {
                    player.vidas--;
                    criarExplosao(player.x + player.w / 2, player.y + player.h / 2, '#ff0000', 25);
                    aplicarTremor(15);
                    $('vidas-txt').innerText = player.vidas;
                }
            }
        }

        // 2. Tiros Teleguiados Perseguidores (Boss 7)
        for (let i = tirosTeleguiados.length - 1; i >= 0; i--) {
            let tt = tirosTeleguiados[i];
            
            // Gravação do rastro dinâmico
            tt.rastro.push({ x: tt.x, y: tt.y });
            if (tt.rastro.length > 8) tt.rastro.shift();

            // IA Teleguiada: Calcula o ângulo em direção à nave do Jogador
            let dx = (player.x + player.w / 2) - tt.x;
            let dy = (player.y + player.h / 2) - tt.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                // Curva em direção ao jogador suavizadamente
                tt.vx += (dx / dist) * 0.15 * (dt / 16);
                tt.vy += (dy / dist) * 0.15 * (dt / 16);
            }

            // Limitação de velocidade terminal para não ficar incontrolável
            let vel = Math.sqrt(tt.vx * tt.vx + tt.vy * tt.vy);
            if (vel > 4.5) {
                tt.vx = (tt.vx / vel) * 4.5;
                tt.vy = (tt.vy / vel) * 4.5;
            }

            tt.x += tt.vx * (dt / 16);
            tt.y += tt.vy * (dt / 16);

            if (tt.y > 610) {
                tirosTeleguiados.splice(i, 1);
                continue;
            }

            // Desenha rastro luminoso e orbe de energia teleguiada
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

            // Colisão do Teleguiado contra o Player
            if (tt.x > player.x && tt.x < player.x + player.w && tt.y > player.y && tt.y < player.y + player.h) {
                tirosTeleguiados.splice(i, 1);
                
                if (player.escudoAtivo) {
                    criarExplosao(tt.x, tt.y, '#00d2ff', 10);
                    aplicarTremor(4);
                } else {
                    player.vidas--;
                    criarExplosao(player.x + player.w / 2, player.y + player.h / 2, '#ff0000', 30);
                    aplicarTremor(18);
                    $('vidas-txt').innerText = player.vidas;
                }
            }
        }

        // ==========================================
        // ATUALIZAÇÃO DO SISTEMA DE PARTÍCULAS
        // ==========================================
        particulas.forEach((p, i) => {
            p.x += p.vx * (dt / 16);
            p.y += p.vy * (dt / 16);
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.life -= dt / 16;
            
            if (p.life <= 0) {
                particulas.splice(i, 1);
                return;
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
        });

        // Alerta visual de habilidade pronta
        if (player.kills >= 3 && !avisandoHabilidade) {
            avisandoHabilidade = true;
            aplicarTremor(3);
        }

        // Distorção visual de Espaço-Tempo (Tokitobashi ativo)
        if (tempoParado) {
            desenharRachadurasEspacoTempo();
            ctx.fillStyle = "rgba(168, 85, 247, 0.08)";
            ctx.fillRect(0, 0, 800, 600);
        }

        if (emDialogoFase7) {
            desenharIntroducaoBoss7();
        }

        ctx.restore(); // Desfaz a rotação/deslocamento do tremor de tela

        // Derrota total do jogador (Game Over)
        if (player.vidas <= 0) {
            modo = 'gameover';
            $('fase-final').innerText = fase;
            $('game-over').classList.add('show');
        }
    }

    requestAnimationFrame(gameLoop);
}

// Inicia o loop de animação imediatamente ao carregar o arquivo script
requestAnimationFrame(gameLoop);
