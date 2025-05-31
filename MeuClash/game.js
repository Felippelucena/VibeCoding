// Classe principal do jogo
class Game {
    constructor() {
        this.canvas = document.getElementById('battlefield');
        this.battlefield = new Battlefield(this.canvas);
        this.ai = new AI();
        
        // Estado do jogo
        this.gameState = 'playing'; // playing, paused, ended
        this.gameTime = 180; // 3 minutos em segundos
        this.gameStartTime = Date.now();
        
        // Jogador
        this.playerElixir = 10;
        this.maxElixir = 10;
        this.elixirRegenRate = 1; // por segundo
        this.lastElixirRegen = Date.now();
        this.selectedCard = null;
        
        // Entidades do jogo
        this.units = [];
        this.spells = [];
        this.effects = [];
        this.towers = this.initializeTowers();
        
        // UI
        this.setupUI();
        this.updateElixirUI();
        this.updateTowerUI();
        
        // Iniciar loops do jogo
        this.startGameLoop();
        this.battlefield.startRenderLoop();
        
        console.log('🎮 Meu Clash Royale iniciado! Boa sorte, comandante!');
    }

    initializeTowers() {
        return {
            // Torres do jogador
            playerLeft: new Tower(200, this.canvas.height - 100, 1000, 'player', 'princess'),
            playerRight: new Tower(600, this.canvas.height - 100, 1000, 'player', 'princess'),
            playerKing: new Tower(400, this.canvas.height - 50, 2000, 'player', 'king'),
            
            // Torres inimigas
            enemyLeft: new Tower(200, 100, 1000, 'enemy', 'princess'),
            enemyRight: new Tower(600, 100, 1000, 'enemy', 'princess'),
            enemyKing: new Tower(400, 50, 2000, 'enemy', 'king')
        };
    }

    setupUI() {
        // Configurar cliques nas cartas
        const cards = document.querySelectorAll('card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                this.selectCard(card);
            });
        });

        // Atualizar timer a cada segundo
        setInterval(() => {
            this.updateGameTimer();
        }, 1000);
    }

    selectCard(cardElement) {
        const cardType = cardElement.dataset.type;
        const cardCost = parseInt(cardElement.dataset.cost);
        
        // Verificar se tem elixir suficiente
        if (this.playerElixir < cardCost) {
            this.showMessage('Elixir insuficiente! 💜');
            return;
        }
        
        // Remover seleção anterior
        document.querySelectorAll('card').forEach(c => c.classList.remove('selected'));
        
        // Selecionar nova carta
        if (this.selectedCard === cardType) {
            this.selectedCard = null; // Deselecionar se clicar na mesma carta
        } else {
            this.selectedCard = cardType;
            cardElement.classList.add('selected');
        }
    }

    handleCanvasClick(x, y) {
        if (!this.selectedCard) return;
        
        // Verificar se é uma posição válida (metade inferior do campo)
        if (!this.battlefield.isValidPlacement(x, y)) {
            this.showMessage('Você só pode colocar unidades na sua área! 🚫');
            return;
        }
        
        const card = CARDS[this.selectedCard];
        const cost = card.cost;
        
        // Verificar elixir novamente
        if (this.playerElixir < cost) {
            this.showMessage('Elixir insuficiente! 💜');
            return;
        }
        
        // Gastar elixir
        this.playerElixir -= cost;
        this.updateElixirUI();
        
        // Criar unidade ou spell
        if (card.type === 'fireball') {
            this.castSpell(card, x, y);
        } else {
            this.spawnUnit(card, x, y, 'player');
        }
        
        // Notificar IA sobre a ação do jogador
        this.ai.reactToEvent(card.type === 'fireball' ? 'spell_cast' : 'unit_spawned', {
            player: 'player',
            card: card,
            x: x,
            y: y
        });
        
        // Deselecionar carta
        this.selectedCard = null;
        document.querySelectorAll('card').forEach(c => c.classList.remove('selected'));
    }

    spawnUnit(card, x, y, player) {
        const unit = new Unit(card, x, y, player);
        this.units.push(unit);
        
        // Efeito de spawn
        this.addEffect({
            type: 'spawn',
            x: x,
            y: y,
            duration: 500
        });
        
        console.log(`${player === 'player' ? 'Jogador' : 'IA'} spawnou ${card.name} em (${Math.round(x)}, ${Math.round(y)})`);
    }

    castSpell(card, x, y) {
        const spell = new Spell(card, x, y, 'player');
        this.spells.push(spell);
        
        console.log(`Jogador lançou ${card.name} em (${Math.round(x)}, ${Math.round(y)})`);
    }

    startGameLoop() {
        const gameLoop = () => {
            if (this.gameState === 'playing') {
                this.update();
            }
            
            // Remover entidades mortas/expiradas
            this.cleanup();
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }

    update() {
        const deltaTime = 16; // ~60 FPS
        
        // Atualizar elixir do jogador
        this.updatePlayerElixir();
        
        // Atualizar IA
        this.ai.update();
        
        // Atualizar unidades
        this.units = this.units.filter(unit => 
            unit.update(deltaTime, this.units, this.towers)
        );
        
        // Atualizar spells
        this.spells = this.spells.filter(spell => 
            spell.update(this.units, this.towers)
        );
        
        // Atualizar torres
        Object.values(this.towers).forEach(tower => {
            tower.update(this.units);
        });
        
        // Verificar condições de vitória
        this.checkWinConditions();
        
        // Atualizar UI das cartas (habilitar/desabilitar baseado no elixir)
        this.updateCardStates();
    }

    updatePlayerElixir() {
        const now = Date.now();
        if (now - this.lastElixirRegen >= 1000 && this.playerElixir < this.maxElixir) {
            this.playerElixir = Math.min(this.maxElixir, this.playerElixir + this.elixirRegenRate);
            this.lastElixirRegen = now;
            this.updateElixirUI();
        }
    }

    updateElixirUI() {
        // Atualizar barra de elixir do jogador
        const playerElixirFill = document.getElementById('playerElixir');
        const playerElixirText = document.getElementById('playerElixirText');
        
        if (playerElixirFill && playerElixirText) {
            const percentage = (this.playerElixir / this.maxElixir) * 100;
            playerElixirFill.style.width = percentage + '%';
            playerElixirText.textContent = `${this.playerElixir}/${this.maxElixir}`;
        }
        
        // Atualizar barra de elixir da IA
        const enemyElixirFill = document.getElementById('enemyElixir');
        const enemyElixirText = document.getElementById('enemyElixirText');
        
        if (enemyElixirFill && enemyElixirText) {
            const percentage = (this.ai.elixir / this.ai.maxElixir) * 100;
            enemyElixirFill.style.width = percentage + '%';
            enemyElixirText.textContent = `${this.ai.elixir}/${this.ai.maxElixir}`;
        }
    }

    updateTowerUI() {
        // Atualizar HP das torres
        const towerElements = {
            playerLeft: document.getElementById('playerLeftTower'),
            playerRight: document.getElementById('playerRightTower'),
            playerKing: document.getElementById('playerKingTower'),
            enemyLeft: document.getElementById('enemyLeftTower'),
            enemyRight: document.getElementById('enemyRightTower'),
            enemyKing: document.getElementById('enemyKingTower')
        };
        
        Object.keys(towerElements).forEach(key => {
            const tower = this.towers[key];
            const element = towerElements[key];
            
            if (tower && element) {
                const hpElement = element.querySelector('.tower-hp');
                if (hpElement) {
                    const icon = tower.type === 'king' ? '🏰' : '🗼';
                    hpElement.textContent = `${icon} ${tower.hp}`;
                    
                    // Marcar torre como destruída
                    if (tower.hp <= 0) {
                        element.classList.add('destroyed');
                    }
                }
            }
        });
    }

    updateCardStates() {
        const cards = document.querySelectorAll('card');
        cards.forEach(card => {
            const cost = parseInt(card.dataset.cost);
            
            if (this.playerElixir < cost) {
                card.classList.add('disabled');
            } else {
                card.classList.remove('disabled');
            }
        });
    }

    updateGameTimer() {
        const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const remaining = Math.max(0, this.gameTime - elapsed);
        
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        
        const timerElement = document.getElementById('gameTimer');
        if (timerElement) {
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Verificar se o tempo acabou
        if (remaining <= 0) {
            this.endGame('draw');
        }
    }

    checkWinConditions() {
        // Verificar se o rei foi destruído
        if (this.towers.playerKing.hp <= 0) {
            this.endGame('defeat');
        } else if (this.towers.enemyKing.hp <= 0) {
            this.endGame('victory');
        }
    }

    endGame(result) {
        this.gameState = 'ended';
        
        let message = '';
        let color = '';
        
        switch(result) {
            case 'victory':
                message = '🎉 VITÓRIA! Você derrotou a IA! 🎉';
                color = '#27ae60';
                break;
            case 'defeat':
                message = '💀 DERROTA! A IA venceu desta vez! 💀';
                color = '#e74c3c';
                break;
            case 'draw':
                message = '⏰ EMPATE! O tempo acabou! ⏰';
                color = '#f39c12';
                break;
        }
        
        this.showMessage(message, color, 5000);
        
        // Oferecer reiniciar jogo
        setTimeout(() => {
            if (confirm('Deseja jogar novamente?')) {
                location.reload();
            }
        }, 3000);
    }

    addEffect(effect) {
        effect.startTime = Date.now();
        this.effects.push(effect);
    }

    cleanup() {
        const now = Date.now();
        
        // Remover efeitos expirados
        this.effects = this.effects.filter(effect => 
            now - effect.startTime < effect.duration
        );
        
        // Remover unidades mortas
        this.units = this.units.filter(unit => unit.hp > 0);
    }

    showMessage(text, color = '#ffd700', duration = 2000) {
        const messageElement = document.getElementById('gameMessages');
        if (messageElement) {
            messageElement.textContent = text;
            messageElement.style.color = color;
            messageElement.classList.add('show');
            
            setTimeout(() => {
                messageElement.classList.remove('show');
            }, duration);
        }
        
        console.log(`📢 ${text}`);
    }

    // Método para pausar/despausar o jogo
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.showMessage('⏸️ Jogo pausado');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.showMessage('▶️ Jogo retomado');
        }
    }

    // Método para ajustar dificuldade da IA
    setAIDifficulty(difficulty) {
        this.ai.setDifficulty(difficulty);
        this.showMessage(`🤖 Dificuldade da IA: ${difficulty.toUpperCase()}`);
    }
}

// Inicializar o jogo quando a página carregar
let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
    
    // Controles do teclado
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case ' ': // Espaço para pausar
                e.preventDefault();
                game.togglePause();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
                // Selecionar cartas com números
                const cardIndex = parseInt(e.key) - 1;
                const cards = document.querySelectorAll('card');
                if (cards[cardIndex]) {
                    cards[cardIndex].click();
                }
                break;
            case 'Escape':
                // Deselecionar carta
                game.selectedCard = null;
                document.querySelectorAll('card').forEach(c => c.classList.remove('selected'));
                break;
        }
    });
    
    // Prevenir zoom no mobile
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    });
    
    console.log('🚀 Controles:');
    console.log('• Clique nas cartas para selecioná-las');
    console.log('• Clique no campo para colocar unidades/spells');
    console.log('• Teclas 1-5 para selecionar cartas rapidamente');
    console.log('• Espaço para pausar/despausar');
    console.log('• ESC para deselecionar carta');
});
