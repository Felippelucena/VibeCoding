// Sistema de Inteligência Artificial
class AI {
    constructor() {
        this.difficulty = 'medium'; // easy, medium, hard
        this.elixir = 10;
        this.maxElixir = 10;
        this.elixirRegenRate = 1; // por segundo
        this.lastElixirRegen = Date.now();
        this.lastAction = Date.now();
        this.actionCooldown = 2000; // 2 segundos entre ações
        this.deck = this.generateDeck();
        this.strategy = this.getStrategy();
    }

    generateDeck() {
        // IA usa as mesmas cartas que o jogador por simplicidade
        return [
            CARDS.knight,
            CARDS.archer,
            CARDS.giant,
            CARDS.fireball,
            CARDS.minions
        ];
    }

    getStrategy() {
        const strategies = {
            easy: {
                aggressiveness: 0.3,
                reactionTime: 3000,
                targetPriority: ['towers', 'units'],
                spellUsage: 0.2
            },
            medium: {
                aggressiveness: 0.6,
                reactionTime: 2000,
                targetPriority: ['units', 'towers'],
                spellUsage: 0.4
            },
            hard: {
                aggressiveness: 0.8,
                reactionTime: 1000,
                targetPriority: ['units', 'towers', 'prediction'],
                spellUsage: 0.6
            }
        };

        return strategies[this.difficulty];
    }

    update() {
        this.updateElixir();
        
        // IA só age se tiver passado o tempo de cooldown
        if (Date.now() - this.lastAction >= this.strategy.reactionTime) {
            this.makeDecision();
        }
    }

    updateElixir() {
        const now = Date.now();
        const timeSinceLastRegen = now - this.lastElixirRegen;
        
        if (timeSinceLastRegen >= 1000 && this.elixir < this.maxElixir) {
            this.elixir = Math.min(this.maxElixir, this.elixir + this.elixirRegenRate);
            this.lastElixirRegen = now;
            game.updateElixirUI();
        }
    }

    makeDecision() {
        const gameState = this.analyzeGameState();
        let action = null;

        // Decisões baseadas na estratégia
        if (gameState.underAttack && Math.random() < 0.8) {
            action = this.defendTowers(gameState);
        } else if (gameState.canCounterAttack && Math.random() < this.strategy.aggressiveness) {
            action = this.planAttack(gameState);
        } else if (gameState.shouldUseSpell && Math.random() < this.strategy.spellUsage) {
            action = this.useSpell(gameState);
        } else if (Math.random() < 0.3) {
            action = this.randomAction();
        }

        if (action) {
            this.executeAction(action);
            this.lastAction = Date.now();
        }
    }

    analyzeGameState() {
        const playerUnits = game.units.filter(u => u.player === 'player');
        const enemyUnits = game.units.filter(u => u.player === 'enemy');
        
        return {
            playerUnits,
            enemyUnits,
            underAttack: this.isUnderAttack(playerUnits),
            canCounterAttack: this.canCounterAttack(),
            shouldUseSpell: this.shouldUseSpell(playerUnits),
            elixirAdvantage: this.elixir >= 5,
            towerThreat: this.getTowerThreat(playerUnits)
        };
    }    isUnderAttack(playerUnits) {
        // Verifica se há unidades do jogador na metade superior do campo (área da IA)
        const halfwayRow = game.battlefield.gridRows / 2;
        return playerUnits.some(unit => {
            const gridPos = game.battlefield.canvasToGrid(unit.x, unit.y);
            return gridPos.row < halfwayRow;
        });
    }

    canCounterAttack() {
        // IA pode contra-atacar se tiver elixir suficiente e poucas unidades no campo
        const enemyUnits = game.units.filter(u => u.player === 'enemy');
        return this.elixir >= 4 && enemyUnits.length < 3;
    }

    shouldUseSpell(playerUnits) {
        // Usar spell se houver muitas unidades do jogador agrupadas
        if (this.elixir < 4) return false;
        
        const clusters = this.findUnitClusters(playerUnits);
        return clusters.some(cluster => cluster.units.length >= 2);
    }

    findUnitClusters(units) {
        const clusters = [];
        const clusterRadius = 80;
        
        units.forEach(unit => {
            let nearbyUnits = units.filter(u => {
                if (u === unit) return false;
                const distance = Math.sqrt(
                    Math.pow(u.x - unit.x, 2) + Math.pow(u.y - unit.y, 2)
                );
                return distance <= clusterRadius;
            });
            
            if (nearbyUnits.length > 0) {
                clusters.push({
                    center: unit,
                    units: [unit, ...nearbyUnits]
                });
            }
        });
        
        return clusters;
    }

    getTowerThreat(playerUnits) {
        const towers = [game.towers.enemyLeft, game.towers.enemyRight, game.towers.enemyKing];
        let maxThreat = 0;
        
        towers.forEach(tower => {
            if (tower.hp <= 0) return;
            
            const threateningUnits = playerUnits.filter(unit => {
                const distance = Math.sqrt(
                    Math.pow(unit.x - tower.x, 2) + Math.pow(unit.y - tower.y, 2)
                );
                return distance <= 200; // Unidades próximas à torre
            });
            
            maxThreat = Math.max(maxThreat, threateningUnits.length);
        });
        
        return maxThreat;
    }

    defendTowers(gameState) {
        // Escolher carta defensiva
        const defensiveCards = this.deck.filter(card => 
            ['knight', 'archer', 'minions'].includes(card.type) && 
            this.elixir >= card.cost
        );
        
        if (defensiveCards.length === 0) return null;
        
        const card = defensiveCards[Math.floor(Math.random() * defensiveCards.length)];
        const position = this.getDefensivePosition(gameState.playerUnits);
        
        return {
            type: 'place_unit',
            card,
            x: position.x,
            y: position.y
        };
    }    getDefensivePosition(playerUnits) {
        if (playerUnits.length === 0) {
            // Posição padrão na frente das torres (área defensiva da IA)
            const gridCol = Math.floor(Math.random() * 8) + 5; // Colunas centrais
            const gridRow = Math.floor(Math.random() * 4) + 2; // Linhas defensivas (2-5)
            return game.battlefield.gridToCanvas(gridCol, gridRow);
        }
        
        // Posicionar perto da unidade mais avançada
        const mostAdvanced = playerUnits.reduce((closest, unit) => 
            unit.y < closest.y ? unit : closest
        );
        
        // Converter para grid e ajustar posição defensiva
        const gridPos = game.battlefield.canvasToGrid(mostAdvanced.x, mostAdvanced.y);
        const defensiveRow = Math.max(0, gridPos.row - 2);
        const defensiveCol = Math.max(0, Math.min(game.battlefield.gridCols - 1, 
            gridPos.col + Math.floor((Math.random() - 0.5) * 4)));
        
        return game.battlefield.gridToCanvas(defensiveCol, defensiveRow);
    }

    planAttack(gameState) {
        // Escolher carta ofensiva
        const offensiveCards = this.deck.filter(card => 
            ['giant', 'knight', 'minions'].includes(card.type) && 
            this.elixir >= card.cost
        );
        
        if (offensiveCards.length === 0) return null;
        
        const card = offensiveCards[Math.floor(Math.random() * offensiveCards.length)];
        const position = this.getAttackPosition();
        
        return {
            type: 'place_unit',
            card,
            x: position.x,
            y: position.y
        };
    }    getAttackPosition() {
        // Escolher lane baseada no grid system (lanes esquerda e direita)
        // Posicionar na área da IA (parte superior do campo)
        const lanes = [
            { col: 4, row: 6 },   // Lane esquerda (mais na frente)
            { col: 13, row: 6 }   // Lane direita (mais na frente)
        ];
        
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        
        // Adicionar variação na posição, mas manter na área da IA
        const finalCol = Math.max(0, Math.min(game.battlefield.gridCols - 1, 
            lane.col + Math.floor((Math.random() - 0.5) * 3)));
        const finalRow = Math.max(2, Math.min(10, // Manter na metade superior
            lane.row + Math.floor((Math.random() - 0.5) * 2)));
        
        return game.battlefield.gridToCanvas(finalCol, finalRow);
    }

    useSpell(gameState) {
        const spellCards = this.deck.filter(card => 
            card.type === 'fireball' && this.elixir >= card.cost
        );
        
        if (spellCards.length === 0) return null;
        
        const clusters = this.findUnitClusters(gameState.playerUnits);
        if (clusters.length === 0) return null;
        
        // Escolher o cluster com mais unidades
        const bestCluster = clusters.reduce((best, cluster) => 
            cluster.units.length > best.units.length ? cluster : best
        );
        
        return {
            type: 'cast_spell',
            card: spellCards[0],
            x: bestCluster.center.x,
            y: bestCluster.center.y
        };
    }    randomAction() {
        // Ação aleatória quando não há estratégia específica
        const availableCards = this.deck.filter(card => this.elixir >= card.cost);
        if (availableCards.length === 0) return null;
        
        const card = availableCards[Math.floor(Math.random() * availableCards.length)];
        
        if (card.type === 'fireball') {
            // Usar spell em posição aleatória na área do jogador
            const gridCol = Math.floor(Math.random() * game.battlefield.gridCols);
            const gridRow = Math.floor(Math.random() * 8) + 10; // Área do jogador
            const pos = game.battlefield.gridToCanvas(gridCol, gridRow);
            
            return {
                type: 'cast_spell',
                card,
                x: pos.x,
                y: pos.y
            };
        } else {
            // Colocar unidade em posição aleatória na área da IA
            const gridCol = Math.floor(Math.random() * game.battlefield.gridCols);
            const gridRow = Math.floor(Math.random() * 8) + 2; // Área da IA
            const pos = game.battlefield.gridToCanvas(gridCol, gridRow);
            
            return {
                type: 'place_unit',
                card,
                x: pos.x,
                y: pos.y
            };
        }
    }

    executeAction(action) {
        if (this.elixir < action.card.cost) return;
        
        this.elixir -= action.card.cost;
        
        if (action.type === 'place_unit') {
            const unit = new Unit(action.card, action.x, action.y, 'enemy');
            game.units.push(unit);
            
            // Efeito de spawn
            game.addEffect({
                type: 'spawn',
                x: action.x,
                y: action.y,
                duration: 500
            });
            
        } else if (action.type === 'cast_spell') {
            const spell = new Spell(action.card, action.x, action.y, 'enemy');
            game.spells.push(spell);
            
            // Efeito visual do spell
            game.addEffect({
                type: 'spell_cast',
                x: action.x,
                y: action.y,
                duration: 1000
            });
        }
        
        game.updateElixirUI();
        
        // Log da ação (para debug)
        console.log(`IA usou ${action.card.name} em (${Math.round(action.x)}, ${Math.round(action.y)})`);
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.strategy = this.getStrategy();
        
        // Ajustar cooldown baseado na dificuldade
        switch(difficulty) {
            case 'easy':
                this.actionCooldown = 4000;
                break;
            case 'medium':
                this.actionCooldown = 2500;
                break;
            case 'hard':
                this.actionCooldown = 1500;
                break;
        }
    }

    // Método para a IA reagir a eventos específicos
    reactToEvent(eventType, data) {
        switch(eventType) {
            case 'tower_attacked':
                // Reagir mais rapidamente se uma torre for atacada
                this.lastAction = Date.now() - this.strategy.reactionTime + 500;
                break;
            case 'unit_spawned':
                // Considerar contra-ataque quando jogador spawn unidade
                if (data.player === 'player' && Math.random() < 0.4) {
                    this.lastAction = Date.now() - this.strategy.reactionTime + 1000;
                }
                break;
            case 'spell_cast':
                // Reagir a spells do jogador
                if (data.player === 'player' && Math.random() < 0.6) {
                    this.lastAction = Date.now() - this.strategy.reactionTime + 800;
                }
                break;
        }
    }
}
