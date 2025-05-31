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
    }

    update(deltaTime, units, towers) {
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
            // Mover em direção à base inimiga
            const targetY = this.player === 'player' ? 100 : 500;
            this.moveTowards({x: 400, y: targetY}, deltaTime);
        }

        return true;
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
    }

    draw(ctx) {
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

        // Desenhar barra de vida se não estiver com vida cheia
        if (this.hp < this.maxHp) {
            const barWidth = this.size * 2;
            const barHeight = 4;
            const hpPercent = this.hp / this.maxHp;

            // Fundo da barra
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth/2, this.y - this.size - 10, barWidth, barHeight);

            // Barra de vida
            ctx.fillStyle = hpPercent > 0.5 ? '#27ae60' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillRect(this.x - barWidth/2, this.y - this.size - 10, barWidth * hpPercent, barHeight);
        }

        // Desenhar ícone da carta
        ctx.fillStyle = 'white';
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(this.card.icon, this.x, this.y + this.size/3);
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
