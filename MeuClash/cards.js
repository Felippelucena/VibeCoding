// Sistema de cartas
class Card {
    constructor(type, name, cost, damage, hp, speed, range, icon) {
        this.type = type;
        this.name = name;
        this.cost = cost;
        this.damage = damage;
        this.hp = hp;
        this.speed = speed;
        this.range = range;
        this.icon = icon;
    }
}

// Definição das cartas disponíveis
const CARDS = {
    knight: new Card('knight', 'Cavaleiro', 3, 150, 1400, 60, 1, '⚔️'),
    archer: new Card('archer', 'Arqueira', 3, 120, 300, 90, 5, '🏹'),
    giant: new Card('giant', 'Gigante', 5, 200, 3000, 30, 1, '👹'),
    fireball: new Card('fireball', 'Bola de Fogo', 4, 500, 0, 0, 0, '🔥'),
    minions: new Card('minions', 'Lacaios', 3, 100, 200, 120, 2, '🦇')
};

// Sistema de unidades no campo
class Unit {
    constructor(card, x, y, player) {
        this.card = card;
        this.x = x;
        this.y = y;
        this.player = player; // 'player' ou 'enemy'
        this.hp = card.hp;
        this.maxHp = card.hp;
        this.target = null;
        this.lastAttack = 0;
        this.moving = false;
        this.size = this.getUnitSize();
        this.color = player === 'player' ? '#3498db' : '#e74c3c';
        this.id = Math.random().toString(36).substr(2, 9);
    }

    getUnitSize() {
        switch(this.card.type) {
            case 'giant': return 25;
            case 'knight': return 15;
            case 'archer': return 10;
            case 'minions': return 8;
            default: return 12;
        }
    }    update(deltaTime, units, towers) {
        if (this.hp <= 0) return false;

        // Encontrar alvo mais próximo
        this.findTarget(units, towers);

        if (this.target) {
            const distance = this.getDistanceTo(this.target);
            
            if (distance <= this.card.range * 20) {
                // Atacar
                this.attack();
            } else {
                // Mover em direção ao alvo
                this.moveTowards(this.target, deltaTime);
            }
        } else {
            // Mover seguindo o caminho mais próximo
            this.followPath(deltaTime);
        }

        return true;
    }    followPath(deltaTime) {
        if (!game.battlefield) {
            // Fallback para movimento básico se o battlefield não estiver disponível
            const targetY = this.player === 'player' ? 100 : 500;
            this.moveTowards({x: 400, y: targetY}, deltaTime);
            return;
        }

        // Determinar alvo final baseado no jogador
        const finalTarget = this.player === 'player' ? 
            { x: 400, y: 100 } :  // Unidades do jogador vão para o topo
            { x: 400, y: 500 };   // Unidades inimigas vão para baixo

        // Para unidades voadoras (minions), movimento direto
        if (this.card.type === 'minions') {
            this.moveTowards(finalTarget, deltaTime);
            return;
        }

        // Para unidades terrestres, verificar se precisa usar ponte
        const needsBridge = this.needsBridgeToReachTarget(finalTarget);
        
        if (needsBridge) {
            // Se precisa da ponte, ir primeiro para a ponte
            const bridgeTarget = this.findPathToBridge(finalTarget);
            if (bridgeTarget) {
                const distanceToBridge = this.getDistanceTo(bridgeTarget);
                
                // Se está próximo da ponte, pode continuar para o alvo final
                if (distanceToBridge < 40) {
                    this.moveTowards(finalTarget, deltaTime);
                } else {
                    // Ainda precisa chegar na ponte
                    this.moveTowards(bridgeTarget, deltaTime);
                }
            } else {
                // Se não encontrou caminho para ponte, ficar parado
                this.moving = false;
            }
        } else {
            // Pode ir direto para o alvo
            this.moveTowards(finalTarget, deltaTime);
        }
    }    // Verificar se a unidade precisa usar ponte para chegar ao alvo
    needsBridgeToReachTarget(target) {
        if (!game.battlefield) return false;
        
        // Unidades voadoras nunca precisam de ponte
        if (this.card.type === 'minions') return false;
        
        const currentSide = this.y < game.battlefield.canvas.height / 2 ? 'top' : 'bottom';
        const targetSide = target.y < game.battlefield.canvas.height / 2 ? 'top' : 'bottom';
        
        // Se estão em lados diferentes, precisa da ponte
        if (currentSide !== targetSide) {
            // Verificar se já está numa ponte
            if (game.battlefield.isOnBridge(this.x, this.y)) {
                return false; // Já está na ponte, pode continuar
            }
            return true;
        }
        
        return false;
    }

    findTarget(units, towers) {
        let closestTarget = null;
        let closestDistance = Infinity;

        // Verificar unidades inimigas
        units.forEach(unit => {
            if (unit.player !== this.player && unit.hp > 0) {
                const distance = this.getDistanceTo(unit);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTarget = unit;
                }
            }
        });

        // Verificar torres inimigas
        const enemyTowers = this.player === 'player' ? 
            [towers.enemyLeft, towers.enemyRight, towers.enemyKing] :
            [towers.playerLeft, towers.playerRight, towers.playerKing];

        enemyTowers.forEach(tower => {
            if (tower.hp > 0) {
                const distance = this.getDistanceTo(tower);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTarget = tower;
                }
            }
        });

        this.target = closestTarget;
    }

    getDistanceTo(target) {
        const dx = this.x - target.x;
        const dy = this.y - target.y;
        return Math.sqrt(dx * dx + dy * dy);
    }    moveTowards(target, deltaTime) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            const speed = this.card.speed * deltaTime / 1000;
            let newX = this.x + (dx / distance) * speed;
            let newY = this.y + (dy / distance) * speed;

            // Verificar se unidades terrestres podem se mover para a nova posição
            if (this.card.type !== 'minions' && game.battlefield) {
                // Para unidades terrestres, verificar se podem estar na nova posição
                if (!game.battlefield.canUnitBeAt(newX, newY)) {
                    // Se não pode ir direto, tentar encontrar caminho através da ponte
                    const bridgePath = this.findPathToBridge(target);
                    if (bridgePath) {
                        const bridgeTarget = bridgePath;
                        const bridgeDx = bridgeTarget.x - this.x;
                        const bridgeDy = bridgeTarget.y - this.y;
                        const bridgeDistance = Math.sqrt(bridgeDx * bridgeDx + bridgeDy * bridgeDy);
                        
                        if (bridgeDistance > 5) {
                            newX = this.x + (bridgeDx / bridgeDistance) * speed;
                            newY = this.y + (bridgeDy / bridgeDistance) * speed;
                        }
                    } else {
                        // Se não encontrou caminho pela ponte, não se mover
                        this.moving = false;
                        return;
                    }
                }
            }

            this.x = newX;
            this.y = newY;
            this.moving = true;
        } else {
            this.moving = false;
        }
    }    // Encontrar caminho para a ponte mais próxima quando precisa atravessar o rio
    findPathToBridge(finalTarget) {
        if (!game.battlefield) return null;

        // Verificar se precisa atravessar o rio para chegar ao alvo
        const currentSide = this.y < game.battlefield.canvas.height / 2 ? 'top' : 'bottom';
        const targetSide = finalTarget.y < game.battlefield.canvas.height / 2 ? 'top' : 'bottom';

        // Se estão no mesmo lado, não precisa da ponte
        if (currentSide === targetSide) return null;

        // Coordenadas das pontes (usando mesma lógica do drawBridges)
        const leftBridgeX = game.battlefield.getGridPosition(game.battlefield.gridCols / 4, 0).x;
        const rightBridgeX = game.battlefield.getGridPosition((game.battlefield.gridCols * 3) / 4, 0).x;
        const riverY = game.battlefield.canvas.height / 2;
        
        const leftBridge = { x: leftBridgeX, y: riverY };
        const rightBridge = { x: rightBridgeX, y: riverY };

        // Calcular qual ponte é mais próxima
        const distToLeftBridge = this.getDistanceTo(leftBridge);
        const distToRightBridge = this.getDistanceTo(rightBridge);

        return distToLeftBridge < distToRightBridge ? leftBridge : rightBridge;
    }

    attack() {
        const now = Date.now();
        if (now - this.lastAttack >= 1000) { // 1 ataque por segundo
            this.lastAttack = now;
            
            if (this.target && this.target.hp > 0) {
                this.target.takeDamage(this.card.damage);
                
                // Efeito visual de ataque
                game.addEffect({
                    type: 'attack',
                    x: this.target.x,
                    y: this.target.y,
                    duration: 300
                });
            }
        }
    }

    takeDamage(damage) {
        this.hp -= damage;
        if (this.hp < 0) this.hp = 0;
        
        // Efeito visual de dano
        game.addEffect({
            type: 'damage',
            x: this.x,
            y: this.y,
            value: damage,
            duration: 1000
        });
    }    draw(ctx) {
        // Desenhar a unidade
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        switch(this.card.type) {
            case 'giant':
                ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
                break;
            case 'archer':
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'minions':
                // Triângulo para representar lacaios voadores
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - this.size);
                ctx.lineTo(this.x - this.size, this.y + this.size);
                ctx.lineTo(this.x + this.size, this.y + this.size);
                ctx.closePath();
                ctx.fill();
                break;
            default:
                // Círculo padrão
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
        }

        // Borda da unidade
        ctx.strokeStyle = this.player === 'player' ? '#3498db' : '#e74c3c';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Desenhar barra de vida sempre visível
        this.drawHealthBar(ctx);

        // Desenhar ícone da carta
        ctx.fillStyle = 'white';
        ctx.font = `${Math.max(12, this.size * 0.8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeText(this.card.icon, this.x, this.y);
        ctx.fillText(this.card.icon, this.x, this.y);
          // Mostrar valor de vida em pequeno texto
        if (game.battlefield && game.battlefield.debugMode) {
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            const healthText = `${this.hp}/${this.maxHp}`;
            ctx.strokeText(healthText, this.x, this.y + this.size + 15);
            ctx.fillText(healthText, this.x, this.y + this.size + 15);
            
            // Mostrar informações de pathfinding
            const side = this.y < game.battlefield.canvas.height / 2 ? 'TOP' : 'BOT';
            const onBridge = game.battlefield.isOnBridge(this.x, this.y) ? ' [PONTE]' : '';
            const pathInfo = `${side}${onBridge}`;
            ctx.fillText(pathInfo, this.x, this.y + this.size + 25);
        }
    }

    drawHealthBar(ctx) {
        const barWidth = this.size * 2.5;
        const barHeight = 6;
        const hpPercent = this.hp / this.maxHp;
        const barY = this.y - this.size - 12;

        // Fundo da barra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);

        // Barra de vida
        let healthColor;
        if (hpPercent > 0.6) healthColor = '#2ecc71';
        else if (hpPercent > 0.3) healthColor = '#f39c12';
        else healthColor = '#e74c3c';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(this.x - barWidth/2, barY, barWidth * hpPercent, barHeight);

        // Borda da barra
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - barWidth/2, barY, barWidth, barHeight);
    }
}

// Torre
class Tower {
    constructor(x, y, hp, player, type = 'princess') {
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.maxHp = hp;
        this.player = player;
        this.type = type;
        this.lastAttack = 0;
        this.range = 120;
        this.damage = type === 'king' ? 200 : 150;
    }

    update(units) {
        if (this.hp <= 0) return;

        // Encontrar unidade inimiga mais próxima no alcance
        let target = null;
        let closestDistance = this.range;

        units.forEach(unit => {
            if (unit.player !== this.player && unit.hp > 0) {
                const distance = this.getDistanceTo(unit);
                if (distance <= this.range && distance < closestDistance) {
                    closestDistance = distance;
                    target = unit;
                }
            }
        });

        if (target) {
            this.attack(target);
        }
    }

    getDistanceTo(target) {
        const dx = this.x - target.x;
        const dy = this.y - target.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    attack(target) {
        const now = Date.now();
        if (now - this.lastAttack >= 1200) { // Torres atacam mais devagar
            this.lastAttack = now;
            target.takeDamage(this.damage);
            
            // Efeito visual de tiro da torre
            game.addEffect({
                type: 'tower_shot',
                fromX: this.x,
                fromY: this.y,
                toX: target.x,
                toY: target.y,
                duration: 500
            });
        }
    }

    takeDamage(damage) {
        this.hp -= damage;
        if (this.hp < 0) this.hp = 0;
        
        // Atualizar UI
        game.updateTowerUI();
        
        // Efeito visual
        game.addEffect({
            type: 'tower_damage',
            x: this.x,
            y: this.y,
            value: damage,
            duration: 1000
        });
    }
}

// Magia/Spell
class Spell {
    constructor(card, x, y, player) {
        this.card = card;
        this.x = x;
        this.y = y;
        this.player = player;
        this.radius = 80; // Raio de efeito
        this.duration = 1000; // Duração do efeito
        this.startTime = Date.now();
    }

    update(units, towers) {
        const elapsed = Date.now() - this.startTime;
        
        if (elapsed >= this.duration) {
            return false; // Remove o spell
        }

        // Aplicar dano (só no primeiro frame)
        if (elapsed < 50) {
            this.applyDamage(units, towers);
        }

        return true;
    }

    applyDamage(units, towers) {
        // Dano em unidades
        units.forEach(unit => {
            if (unit.player !== this.player) {
                const distance = this.getDistanceTo(unit);
                if (distance <= this.radius) {
                    unit.takeDamage(this.card.damage);
                }
            }
        });

        // Dano em torres
        const enemyTowers = this.player === 'player' ? 
            [towers.enemyLeft, towers.enemyRight, towers.enemyKing] :
            [towers.playerLeft, towers.playerRight, towers.playerKing];

        enemyTowers.forEach(tower => {
            if (tower.hp > 0) {
                const distance = this.getDistanceTo(tower);
                if (distance <= this.radius) {
                    tower.takeDamage(this.card.damage);
                }
            }
        });
    }

    getDistanceTo(target) {
        const dx = this.x - target.x;
        const dy = this.y - target.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    draw(ctx) {
        const elapsed = Date.now() - this.startTime;
        const progress = elapsed / this.duration;
        
        // Efeito de explosão
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        
        // Círculo de fogo
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#ff6b35');
        gradient.addColorStop(0.5, '#f7931e');
        gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * (1 + progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
