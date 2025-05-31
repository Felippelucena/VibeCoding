// Gerenciador do campo de batalha
class Battlefield {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Configurar canvas para 60 FPS
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        this.setupCanvas();
    }

    setupCanvas() {
        // Configurações do contexto para melhor performance
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Evento de clique no canvas
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            game.handleCanvasClick(x, y);
        });

        // Prevenir menu de contexto
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    startRenderLoop() {
        const animate = (currentTime) => {
            // Controle de FPS
            if (currentTime - this.lastFrameTime >= this.frameInterval) {
                const deltaTime = currentTime - this.lastFrameTime;
                this.render(deltaTime);
                this.lastFrameTime = currentTime;
            }
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    render(deltaTime) {
        // Limpar canvas
        this.clear();
        
        // Desenhar fundo do campo
        this.drawBackground();
        
        // Desenhar linha do meio
        this.drawMiddleLine();
        
        // Desenhar áreas das torres
        this.drawTowerAreas();
        
        // Desenhar rio (linha divisória)
        this.drawRiver();
        
        // Desenhar pontes
        this.drawBridges();
        
        // Desenhar unidades
        game.units.forEach(unit => {
            unit.draw(this.ctx);
        });
        
        // Desenhar spells
        game.spells.forEach(spell => {
            spell.draw(this.ctx);
        });
        
        // Desenhar efeitos
        game.effects.forEach(effect => {
            this.drawEffect(effect);
        });
        
        // Desenhar área de seleção se houver carta selecionada
        if (game.selectedCard) {
            this.drawPlacementArea();
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawBackground() {
        // Gradiente de fundo
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#8B4513'); // Marrom para área inimiga
        gradient.addColorStop(0.5, '#228B22'); // Verde para o meio
        gradient.addColorStop(1, '#4169E1'); // Azul para área do jogador
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Textura de grama (pontos aleatórios)
        this.ctx.fillStyle = 'rgba(34, 139, 34, 0.3)';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            this.ctx.fillRect(x, y, 2, 2);
        }
    }

    drawMiddleLine() {
        // Linha divisória no meio
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height / 2);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawTowerAreas() {
        // Área das torres inimigas (superior)
        this.ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
        this.ctx.fillRect(0, 0, this.width, 200);
        
        // Área das torres do jogador (inferior)
        this.ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        this.ctx.fillRect(0, this.height - 200, this.width, 200);
        
        // Círculos indicando posições das torres
        this.drawTowerPositions();
    }

    drawTowerPositions() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        // Torres inimigas
        this.drawTowerCircle(200, 100); // Torre esquerda
        this.drawTowerCircle(600, 100); // Torre direita
        this.drawTowerCircle(400, 50);  // Torre do rei
        
        // Torres do jogador
        this.drawTowerCircle(200, this.height - 100); // Torre esquerda
        this.drawTowerCircle(600, this.height - 100); // Torre direita
        this.drawTowerCircle(400, this.height - 50);  // Torre do rei
        
        this.ctx.setLineDash([]);
    }

    drawTowerCircle(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 40, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawRiver() {
        // Rio no meio do campo
        const riverY = this.height / 2;
        const riverHeight = 40;
        
        // Água
        this.ctx.fillStyle = '#4169E1';
        this.ctx.fillRect(0, riverY - riverHeight/2, this.width, riverHeight);
        
        // Efeito de ondas
        this.ctx.strokeStyle = '#87CEEB';
        this.ctx.lineWidth = 2;
        
        for (let x = 0; x < this.width; x += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, riverY - 10);
            this.ctx.quadraticCurveTo(x + 10, riverY - 20, x + 20, riverY - 10);
            this.ctx.stroke();
        }
    }

    drawBridges() {
        // Pontes sobre o rio
        const bridgeWidth = 100;
        const bridgeHeight = 50;
        const riverY = this.height / 2;
        
        // Ponte esquerda
        this.drawBridge(150, riverY, bridgeWidth, bridgeHeight);
        
        // Ponte direita
        this.drawBridge(550, riverY, bridgeWidth, bridgeHeight);
    }

    drawBridge(x, y, width, height) {
        // Estrutura da ponte
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x - width/2, y - height/2, width, height);
        
        // Detalhes da ponte
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        
        // Vigas verticais
        for (let i = 0; i < 4; i++) {
            const vx = x - width/2 + (width/4) * (i + 0.5);
            this.ctx.beginPath();
            this.ctx.moveTo(vx, y - height/2);
            this.ctx.lineTo(vx, y + height/2);
            this.ctx.stroke();
        }
        
        // Vigas horizontais
        this.ctx.beginPath();
        this.ctx.moveTo(x - width/2, y);
        this.ctx.lineTo(x + width/2, y);
        this.ctx.stroke();
    }

    drawPlacementArea() {
        // Área onde o jogador pode colocar cartas (metade inferior)
        this.ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        this.ctx.fillRect(0, this.height / 2, this.width, this.height / 2);
        
        // Borda da área
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height / 2);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Texto indicativo
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Área de Colocação', this.width / 2, this.height / 2 + 30);
    }

    drawEffect(effect) {
        const elapsed = Date.now() - effect.startTime;
        const progress = elapsed / effect.duration;
        
        if (progress >= 1) return;
        
        this.ctx.save();
        
        switch(effect.type) {
            case 'attack':
                this.drawAttackEffect(effect, progress);
                break;
            case 'damage':
                this.drawDamageEffect(effect, progress);
                break;
            case 'tower_shot':
                this.drawTowerShotEffect(effect, progress);
                break;
            case 'tower_damage':
                this.drawTowerDamageEffect(effect, progress);
                break;
        }
        
        this.ctx.restore();
    }

    drawAttackEffect(effect, progress) {
        // Efeito de ataque - círculos expandindo
        this.ctx.globalAlpha = 1 - progress;
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        
        const radius = 20 + (progress * 30);
        this.ctx.beginPath();
        this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawDamageEffect(effect, progress) {
        // Texto de dano flutuando
        this.ctx.globalAlpha = 1 - progress;
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        
        const y = effect.y - (progress * 50);
        this.ctx.strokeText(`-${effect.value}`, effect.x, y);
        this.ctx.fillText(`-${effect.value}`, effect.x, y);
    }

    drawTowerShotEffect(effect, progress) {
        // Projétil da torre
        const currentX = effect.fromX + (effect.toX - effect.fromX) * progress;
        const currentY = effect.fromY + (effect.toY - effect.fromY) * progress;
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Rastro
        this.ctx.globalAlpha = 0.5;
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(effect.fromX, effect.fromY);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
    }

    drawTowerDamageEffect(effect, progress) {
        // Efeito de dano na torre - explosão
        this.ctx.globalAlpha = 1 - progress;
        
        const gradient = this.ctx.createRadialGradient(
            effect.x, effect.y, 0,
            effect.x, effect.y, 50 + progress * 50
        );
        gradient.addColorStop(0, '#ff6b35');
        gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(effect.x, effect.y, 50 + progress * 50, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // Método para obter coordenadas do mouse relativas ao canvas
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    // Verificar se uma posição está na área válida para colocação
    isValidPlacement(x, y) {
        // Só pode colocar na metade inferior (área do jogador)
        return y > this.height / 2;
    }
}
