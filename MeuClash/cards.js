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
        // Obter o caminho mais próximo do battlefield
        if (game.battlefield) {
            const path = game.battlefield.getNearestPath(this.x, this.y);
            
            if (path && path.length > 0) {
                // Para unidades inimigas, seguir do início para o fim do caminho
                // Para unidades do jogador, seguir do fim para o início
                let targetPoint = null;
                
                if (this.player === 'enemy') {
                    // Unidades inimigas: encontrar o próximo ponto à frente no caminho
                    for (let i = 0; i < path.length; i++) {
                        const point = path[i];
                        const distanceToPoint = this.getDistanceTo(point);
                        
                        // Se está próximo o suficiente de um ponto, ir para o próximo
                        if (distanceToPoint < 30 && i < path.length - 1) {
                            targetPoint = path[i + 1];
                            break;
                        } else if (distanceToPoint >= 30) {
                            targetPoint = point;
                            break;
                        }
                    }
                    
                    // Se não encontrou um ponto ou chegou ao final, ir para o último ponto
                    if (!targetPoint) {
                        targetPoint = path[path.length - 1];
                    }
                } else {
                    // Unidades do jogador: seguir caminho invertido (do fim para o início)
                    for (let i = path.length - 1; i >= 0; i--) {
                        const point = path[i];
                        const distanceToPoint = this.getDistanceTo(point);
                        
                        if (distanceToPoint < 30 && i > 0) {
                            targetPoint = path[i - 1];
                            break;
                        } else if (distanceToPoint >= 30) {
                            targetPoint = point;
                            break;
                        }
                    }
                    
                    if (!targetPoint) {
                        targetPoint = path[0];
                    }
                }
                
                if (targetPoint) {
                    this.moveTowards(targetPoint, deltaTime);
                }
            }
        } else {
            // Fallback para movimento básico se o battlefield não estiver disponível
            const targetY = this.player === 'player' ? 100 : 500;
            this.moveTowards({x: 400, y: targetY}, deltaTime);
        }
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
    }

    moveTowards(target, deltaTime) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            const speed = this.card.speed * deltaTime / 1000;
            this.x += (dx / distance) * speed;
            this.y += (dy / distance) * speed;
            this.moving = true;
        } else {
            this.moving = false;
        }
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
