// Gerenciador do campo de batalha
class Battlefield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    // Sistema de grid
    this.gridCols = 19; // Número ímpar de colunas para simetria perfeita (0-18)
    this.gridRows = 33; // Número ímpar de linhas para simetria perfeita (0-32)
    this.gridWidth = 0;
    this.gridHeight = 0;

    // Caminhos de movimento
    this.leftPath = [];
    this.rightPath = [];

    // Debug mode
    this.debugMode = false;

    // Configurar canvas para 60 FPS
    this.lastFrameTime = 0;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;

    this.setupCanvas();
    this.calculateGrid();
    this.generatePaths();
  }

  setupCanvas() {
    // Configurar tamanho responsivo do canvas
    this.resizeCanvas();

    // Configurações do contexto para melhor performance
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    // Evento de clique no canvas
    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      game.handleCanvasClick(x, y);
    });

    // Redimensionar canvas quando a janela muda de tamanho
    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.calculateGrid();
      this.generatePaths();
    }); // Adicionar teclas para debug (pressionar D para mostrar/ocultar grid, T para testar)
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "d") {
        this.debugMode = !this.debugMode;
        console.log("Debug mode:", this.debugMode ? "ON" : "OFF");
      } else if (e.key.toLowerCase() === "t") {
        this.testPaths();
      }
    });

    // Prevenir menu de contexto
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();

    // Calcular tamanho baseado no container, mantendo proporção 2:3
    const maxWidth = containerRect.width; // Padding
    const maxHeight = containerRect.height;

    let width = Math.min(maxWidth, maxHeight * (2 / 3)) + 50;
    let height = width * (3 / 2) + 50;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * (2 / 3);
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";
  }

  calculateGrid() {
    this.gridWidth = this.canvas.width / this.gridCols;
    this.gridHeight = this.canvas.height / this.gridRows;
  }

  generatePaths() {
    // Limpar caminhos existentes
    this.leftPath = [];
    this.rightPath = [];

    // Posições simétricas com números inteiros
    const centerCol = Math.floor(this.gridCols / 2); // Col 9 (centro)
    const leftCol = Math.floor(this.gridCols / 4); // Col 4 (esquerda)
    const rightCol = Math.floor((this.gridCols * 3) / 4); // Col 14 (direita)
    const centerRow = Math.floor(this.gridRows / 2); // Row 16 (centro)

    // Posições das torres na sequência correta
    const enemyKingPos = this.getGridPosition(centerCol, 1);
    const enemyLeftTowerPos = this.getGridPosition(leftCol, 3);
    const enemyRightTowerPos = this.getGridPosition(rightCol, 3);
    const playerLeftTowerPos = this.getGridPosition(leftCol, this.gridRows - 3);
    const playerRightTowerPos = this.getGridPosition(
      rightCol,
      this.gridRows - 3
    );
    const playerKingPos = this.getGridPosition(centerCol, this.gridRows - 2);

    // CAMINHO ESQUERDO: Torre Rei Inimiga → Torre Princesa Esquerda Inimiga → Torre Princesa Esquerda Jogador → Torre Rei Jogador
    this.leftPath.push(enemyKingPos);
    this.leftPath.push(enemyLeftTowerPos);
    // Ponto no meio do campo para atravessar o rio pela ponte esquerda
    this.leftPath.push(this.getGridPosition(leftCol, centerRow));
    this.leftPath.push(playerLeftTowerPos);
    this.leftPath.push(playerKingPos);

    // CAMINHO DIREITO: Torre Rei Inimiga → Torre Princesa Direita Inimiga → Torre Princesa Direita Jogador → Torre Rei Jogador
    this.rightPath.push(enemyKingPos);
    this.rightPath.push(enemyRightTowerPos);
    // Ponto no meio do campo para atravessar o rio pela ponte direita
    this.rightPath.push(this.getGridPosition(rightCol, centerRow));
    this.rightPath.push(playerRightTowerPos);
    this.rightPath.push(playerKingPos);
  }

  getGridPosition(col, row) {
    return {
      x: col * this.gridWidth + this.gridWidth / 2,
      y: row * this.gridHeight + this.gridHeight / 2,
    };
  }

  // Métodos para conversão entre sistemas de coordenadas
  gridToCanvas(col, row) {
    return this.getGridPosition(col, row);
  }

  canvasToGrid(x, y) {
    return {
      col: Math.floor(x / this.gridWidth),
      row: Math.floor(y / this.gridHeight),
    };
  }

  worldToGrid(x, y) {
    return this.canvasToGrid(x, y);
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

    // Desenhar grid se estiver em modo debug
    if (this.debugMode) {
      this.drawGrid();
    }

    // Desenhar caminhos
    this.drawPaths();

    // Desenhar linha do meio
    this.drawMiddleLine();

    // Desenhar torres no canvas
    this.drawTowers();

    // Desenhar rio (linha divisória)
    this.drawRiver();

    // Desenhar pontes
    this.drawBridges();

    // Desenhar unidades
    game.units.forEach((unit) => {
      unit.draw(this.ctx);
    });

    // Desenhar spells
    game.spells.forEach((spell) => {
      spell.draw(this.ctx);
    });

    // Desenhar efeitos
    game.effects.forEach((effect) => {
      this.drawEffect(effect);
    });

    // Desenhar área de seleção se houver carta selecionada
    if (game.selectedCard) {
      this.drawPlacementArea();
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  drawGrid() {
    // Desenhar grid para debug (linhas finas)
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.ctx.lineWidth = 1;

    // Linhas verticais
    for (let col = 0; col <= this.gridCols; col++) {
      const x = col * this.gridWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    // Linhas horizontais
    for (let row = 0; row <= this.gridRows; row++) {
      const y = row * this.gridHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Números das colunas e linhas para referência
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    this.ctx.font = `${Math.max(8, this.gridHeight / 5)}px Arial`;
    this.ctx.textAlign = "center";

    // Números das colunas (no topo)
    for (let col = 0; col < this.gridCols; col++) {
      const x = col * this.gridWidth + this.gridWidth / 2;
      this.ctx.fillText(col.toString(), x, 15);
    }

    // Números das linhas (à esquerda)
    this.ctx.textAlign = "left";
    for (let row = 0; row < this.gridRows; row++) {
      const y = row * this.gridHeight + this.gridHeight / 2;
      this.ctx.fillText(row.toString(), 5, y + 5);
    }
    // Informações do grid no canto superior direito
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(this.canvas.width - 180, 5, 175, 100);

    this.ctx.fillStyle = "white";
    this.ctx.font = "11px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `Grid Simétrico: ${this.gridCols}x${this.gridRows}`,
      this.canvas.width - 175,
      20
    );
    this.ctx.fillText(
      `Colunas: 0-${this.gridCols - 1} (${this.gridCols})`,
      this.canvas.width - 175,
      35
    );
    this.ctx.fillText(
      `Linhas: 0-${this.gridRows - 1} (${this.gridRows})`,
      this.canvas.width - 175,
      50
    );
    this.ctx.fillText(
      `Centro: Col ${Math.floor(this.gridCols / 2)}, Row ${Math.floor(
        this.gridRows / 2
      )}`,
      this.canvas.width - 175,
      65
    );
    this.ctx.fillText(
      `Cell: ${Math.round(this.gridWidth)}x${Math.round(this.gridHeight)}`,
      this.canvas.width - 175,
      80
    );
    this.ctx.fillText(
      `Canvas: ${this.canvas.width}x${this.canvas.height}`,
      this.canvas.width - 175,
      95
    );
    this.ctx.fillText(`Pressione D para toggle`, this.canvas.width - 175, 110);
  }
  drawPaths() {
    // Desenhar caminho esquerdo
    this.drawPath(
      this.leftPath,
      "rgba(255, 165, 0, 0.4)",
      this.gridWidth * 0.6,
      "Caminho Esquerdo"
    );

    // Desenhar caminho direito
    this.drawPath(
      this.rightPath,
      "rgba(255, 165, 0, 0.4)",
      this.gridWidth * 0.6,
      "Caminho Direito"
    );
  }

  drawPath(path, color, width, label) {
    if (path.length < 2) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    this.ctx.beginPath();
    this.ctx.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
      this.ctx.lineTo(path[i].x, path[i].y);
    }

    this.ctx.stroke();

    // Desenhar setas direcionais
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      this.drawArrow(from, to, "rgba(255, 215, 0, 0.8)");
    }

    // Desenhar label do caminho se estiver em modo debug
    if (this.debugMode && path.length > 0) {
      const midPoint = path[Math.floor(path.length / 2)];
      this.ctx.fillStyle = "white";
      this.ctx.font = `bold ${Math.max(10, this.gridHeight / 4)}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.strokeStyle = "black";
      this.ctx.lineWidth = 2;
      this.ctx.strokeText(label, midPoint.x, midPoint.y - this.gridHeight / 2);
      this.ctx.fillText(label, midPoint.x, midPoint.y - this.gridHeight / 2);
    }
  }

  drawArrow(from, to, color) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 3;

    const arrowLength = 15;
    const arrowWidth = 8;

    this.ctx.beginPath();
    this.ctx.moveTo(midX, midY);
    this.ctx.lineTo(
      midX - arrowLength * Math.cos(angle - Math.PI / 6),
      midY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      midX - arrowLength * Math.cos(angle + Math.PI / 6),
      midY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawTowers() {
    // Posições das torres no grid - perfeitamente simétricas
    const towers = {
      // Torres inimigas
      enemyKing: {
        col: Math.floor(this.gridCols / 2),
        row: 1,
        hp: game.towers.enemyKing.hp,
        maxHp: game.towers.enemyKing.maxHp,
        type: "king",
      },
      enemyLeft: {
        col: Math.floor(this.gridCols / 4),
        row: 3,
        hp: game.towers.enemyLeft.hp,
        maxHp: game.towers.enemyLeft.maxHp,
        type: "princess",
      },
      enemyRight: {
        col: Math.floor((this.gridCols * 3) / 4),
        row: 3,
        hp: game.towers.enemyRight.hp,
        maxHp: game.towers.enemyRight.maxHp,
        type: "princess",
      },

      // Torres do jogador
      playerLeft: {
        col: Math.floor(this.gridCols / 4),
        row: this.gridRows - 3,
        hp: game.towers.playerLeft.hp,
        maxHp: game.towers.playerLeft.maxHp,
        type: "princess",
      },
      playerRight: {
        col: Math.floor((this.gridCols * 3) / 4),
        row: this.gridRows - 3,
        hp: game.towers.playerRight.hp,
        maxHp: game.towers.playerRight.maxHp,
        type: "princess",
      },
      playerKing: {
        col: Math.floor(this.gridCols / 2),
        row: this.gridRows - 2,
        hp: game.towers.playerKing.hp,
        maxHp: game.towers.playerKing.maxHp,
        type: "king",
      },
    };

    // Desenhar cada torre
    Object.keys(towers).forEach((key) => {
      const tower = towers[key];
      const pos = this.getGridPosition(tower.col, tower.row);
      const isPlayer = key.startsWith("player");

      this.drawTower(pos.x, pos.y, tower.hp, tower.maxHp, tower.type, isPlayer);
    });
  }

  drawTower(x, y, hp, maxHp, type, isPlayer) {
    const radius = type === "king" ? 35 : 25;
    const isDestroyed = hp <= 0;

    // Cor da torre baseada no tipo e se é do jogador
    let towerColor, borderColor;
    if (isDestroyed) {
      towerColor = "#7f8c8d";
      borderColor = "#95a5a6";
    } else if (type === "king") {
      towerColor = isPlayer ? "#f39c12" : "#e67e22";
      borderColor = "#ffd700";
    } else {
      towerColor = isPlayer ? "#3498db" : "#e74c3c";
      borderColor = "#ffd700";
    }

    // Desenhar base da torre
    this.ctx.fillStyle = towerColor;
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    if (!isDestroyed) {
      this.ctx.stroke();
    }

    // Desenhar ícone da torre
    this.ctx.fillStyle = "white";
    this.ctx.font = `${radius}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const icon = type === "king" ? "🏰" : "🗼";
    this.ctx.fillText(icon, x, y);

    // Desenhar barra de vida
    if (!isDestroyed) {
      this.drawHealthBar(x, y - radius - 10, radius * 2, 8, hp, maxHp);
    }

    // Desenhar texto de vida
    this.ctx.fillStyle = isDestroyed ? "#95a5a6" : "white";
    this.ctx.font = "bold 12px Arial";
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(hp.toString(), x, y + radius + 15);
    this.ctx.fillText(hp.toString(), x, y + radius + 15);
  }

  drawHealthBar(x, y, width, height, currentHp, maxHp) {
    const percentage = currentHp / maxHp;

    // Fundo da barra
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(x - width / 2, y, width, height);

    // Barra de vida
    let barColor;
    if (percentage > 0.6) barColor = "#2ecc71";
    else if (percentage > 0.3) barColor = "#f39c12";
    else barColor = "#e74c3c";

    this.ctx.fillStyle = barColor;
    this.ctx.fillRect(x - width / 2, y, width * percentage, height);

    // Borda da barra
    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - width / 2, y, width, height);
  }
  drawBackground() {
    // Gradiente de fundo
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#8B4513"); // Marrom para área inimiga
    gradient.addColorStop(0.5, "#228B22"); // Verde para o meio
    gradient.addColorStop(1, "#4169E1"); // Azul para área do jogador

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Textura de grama (pontos aleatórios baseados no grid)
    this.ctx.fillStyle = "rgba(34, 139, 34, 0.3)";
    for (let col = 0; col < this.gridCols; col++) {
      for (let row = 0; row < this.gridRows; row++) {
        if (Math.random() > 0.7) {
          const x = col * this.gridWidth + Math.random() * this.gridWidth;
          const y = row * this.gridHeight + Math.random() * this.gridHeight;
          this.ctx.fillRect(x, y, 2, 2);
        }
      }
    }
  }

  drawMiddleLine() {
    // Linha divisória no meio
    this.ctx.strokeStyle = "#FFD700";
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height / 2);
    this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  drawRiver() {
    // Rio no meio do campo
    const riverY = this.canvas.height / 2;
    const riverHeight = this.gridHeight;

    // Água
    this.ctx.fillStyle = "#4169E1";
    this.ctx.fillRect(
      0,
      riverY - riverHeight / 2,
      this.canvas.width,
      riverHeight
    );

    // Efeito de ondas
    this.ctx.strokeStyle = "#87CEEB";
    this.ctx.lineWidth = 2;

    for (let x = 0; x < this.canvas.width; x += this.gridWidth) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, riverY - riverHeight / 4);
      this.ctx.quadraticCurveTo(
        x + this.gridWidth / 2,
        riverY - riverHeight / 2,
        x + this.gridWidth,
        riverY - riverHeight / 4
      );
      this.ctx.stroke();
    }
  }

  drawBridges() {
    // Pontes sobre o rio baseadas no grid
    const bridgeWidth = this.gridWidth * 3;
    const bridgeHeight = this.gridHeight;
    const riverY = this.canvas.height / 2;

    // Ponte esquerda
    const leftBridgeX = this.getGridPosition(this.gridCols / 4, 0).x;
    this.drawBridge(leftBridgeX, riverY, bridgeWidth, bridgeHeight);

    // Ponte direita
    const rightBridgeX = this.getGridPosition((this.gridCols * 3) / 4, 0).x;
    this.drawBridge(rightBridgeX, riverY, bridgeWidth, bridgeHeight);
  }

  drawBridge(x, y, width, height) {
    // Estrutura da ponte
    this.ctx.fillStyle = "#8B4513";
    this.ctx.fillRect(x - width / 2, y - height / 2, width, height);

    // Detalhes da ponte
    this.ctx.strokeStyle = "#654321";
    this.ctx.lineWidth = 2;

    // Vigas verticais
    const numBeams = 4;
    for (let i = 0; i < numBeams; i++) {
      const vx = x - width / 2 + (width / numBeams) * (i + 0.5);
      this.ctx.beginPath();
      this.ctx.moveTo(vx, y - height / 2);
      this.ctx.lineTo(vx, y + height / 2);
      this.ctx.stroke();
    }

    // Vigas horizontais
    this.ctx.beginPath();
    this.ctx.moveTo(x - width / 2, y);
    this.ctx.lineTo(x + width / 2, y);
    this.ctx.stroke();
  }
  drawPlacementArea() {
    // Área onde o jogador pode colocar cartas (metade inferior)
    this.ctx.fillStyle = "rgba(52, 152, 219, 0.3)";
    this.ctx.fillRect(
      0,
      this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height / 2
    );

    // Borda da área
    this.ctx.strokeStyle = "#3498db";
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height / 2);
    this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Destacar células válidas no grid se estiver em debug mode
    if (this.debugMode) {
      this.ctx.strokeStyle = "rgba(52, 152, 219, 0.6)";
      this.ctx.lineWidth = 2;

      const startRow = Math.ceil(this.gridRows / 2);
      for (let row = startRow; row < this.gridRows; row++) {
        for (let col = 0; col < this.gridCols; col++) {
          const x = col * this.gridWidth;
          const y = row * this.gridHeight;
          this.ctx.strokeRect(x, y, this.gridWidth, this.gridHeight);
        }
      }
    }

    // Texto indicativo
    this.ctx.fillStyle = "white";
    this.ctx.font = `bold ${Math.max(12, this.gridHeight / 3)}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 2;
    const text = "Área de Colocação";
    const textY = this.canvas.height / 2 + this.gridHeight;
    this.ctx.strokeText(text, this.canvas.width / 2, textY);
    this.ctx.fillText(text, this.canvas.width / 2, textY);

    // Mostrar informações da carta selecionada
    if (game.selectedCard) {
      const card = CARDS[game.selectedCard];
      this.ctx.font = `${Math.max(10, this.gridHeight / 4)}px Arial`;
      const cardInfo = `${card.name} (${card.cost} ⚡)`;
      const infoY = textY + this.gridHeight / 2;
      this.ctx.strokeText(cardInfo, this.canvas.width / 2, infoY);
      this.ctx.fillText(cardInfo, this.canvas.width / 2, infoY);
    }
  }

  drawEffect(effect) {
    const elapsed = Date.now() - effect.startTime;
    const progress = elapsed / effect.duration;

    if (progress >= 1) return;

    this.ctx.save();

    switch (effect.type) {
      case "attack":
        this.drawAttackEffect(effect, progress);
        break;
      case "damage":
        this.drawDamageEffect(effect, progress);
        break;
      case "tower_shot":
        this.drawTowerShotEffect(effect, progress);
        break;
      case "tower_damage":
        this.drawTowerDamageEffect(effect, progress);
        break;
    }

    this.ctx.restore();
  }

  drawAttackEffect(effect, progress) {
    // Efeito de ataque - círculos expandindo
    this.ctx.globalAlpha = 1 - progress;
    this.ctx.strokeStyle = "#FFD700";
    this.ctx.lineWidth = 3;

    const radius = this.gridWidth * 0.3 + progress * this.gridWidth * 0.5;
    this.ctx.beginPath();
    this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  drawDamageEffect(effect, progress) {
    // Texto de dano flutuando
    this.ctx.globalAlpha = 1 - progress;
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.font = `bold ${Math.max(16, this.gridHeight / 2)}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = 2;

    const y = effect.y - progress * this.gridHeight;
    this.ctx.strokeText(`-${effect.value}`, effect.x, y);
    this.ctx.fillText(`-${effect.value}`, effect.x, y);
  }

  drawTowerShotEffect(effect, progress) {
    // Projétil da torre
    const currentX = effect.fromX + (effect.toX - effect.fromX) * progress;
    const currentY = effect.fromY + (effect.toY - effect.fromY) * progress;

    this.ctx.fillStyle = "#FFD700";
    this.ctx.beginPath();
    this.ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Rastro
    this.ctx.globalAlpha = 0.5;
    this.ctx.strokeStyle = "#FFD700";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(effect.fromX, effect.fromY);
    this.ctx.lineTo(currentX, currentY);
    this.ctx.stroke();
  }

  drawTowerDamageEffect(effect, progress) {
    // Efeito de dano na torre - explosão
    this.ctx.globalAlpha = 1 - progress;

    const maxRadius = this.gridWidth;
    const gradient = this.ctx.createRadialGradient(
      effect.x,
      effect.y,
      0,
      effect.x,
      effect.y,
      maxRadius * progress
    );
    gradient.addColorStop(0, "#ff6b35");
    gradient.addColorStop(1, "rgba(255, 107, 53, 0)");

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(effect.x, effect.y, maxRadius * progress, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // Método para obter coordenadas do mouse relativas ao canvas
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  } // Verificar se uma posição está na área válida para colocação
  isValidPlacement(x, y) {
    // Só pode colocar na metade inferior (área do jogador)
    return y > this.canvas.height / 2;
  }

  // Verificar se uma posição está na área válida para a IA
  isValidAIPlacement(x, y) {
    // IA só pode colocar na metade superior (área da IA)
    return y < this.canvas.height / 2;
  }

  // Verificar se uma posição está no rio (área bloqueada)
  isInRiver(x, y) {
    const riverY = this.canvas.height / 2;
    const riverHeight = this.gridHeight;
    return Math.abs(y - riverY) < riverHeight / 2;
  }

  // Verificar se uma posição está numa ponte
  isOnBridge(x, y) {
    if (!this.isInRiver(x, y)) return false;

    const leftBridgeX = this.getGridPosition(
      Math.floor(this.gridCols / 4),
      0
    ).x;
    const rightBridgeX = this.getGridPosition(
      Math.floor((this.gridCols * 3) / 4),
      0
    ).x;
    const bridgeWidth = this.gridWidth * 3;

    return (
      Math.abs(x - leftBridgeX) < bridgeWidth / 2 ||
      Math.abs(x - rightBridgeX) < bridgeWidth / 2
    );
  }

  // Verificar se uma criatura pode estar nesta posição (não pode atravessar rio diretamente)
  canUnitBeAt(x, y) {
    if (this.isInRiver(x, y)) {
      return this.isOnBridge(x, y);
    }
    return true;
  }

  // Ajustar posição para o centro da célula do grid mais próxima
  snapToGrid(x, y) {
    const col = Math.floor(x / this.gridWidth);
    const row = Math.floor(y / this.gridHeight);
    return this.getGridPosition(col, row);
  } // Função de teste para verificar caminhos
  testPaths() {
    console.log("🛤️ Testando sistema de caminhos...");
    console.log(`Grid: ${this.gridCols}x${this.gridRows}`);
    console.log(`Canvas: ${this.canvas.width}x${this.canvas.height}`);
    console.log(`Caminho esquerdo: ${this.leftPath.length} pontos`);
    console.log(`Caminho direito: ${this.rightPath.length} pontos`);

    // Testar conversões grid <-> canvas
    const testGridPos = { col: 9, row: 16 }; // Centro
    const canvasPos = this.gridToCanvas(testGridPos.col, testGridPos.row);
    const backToGrid = this.canvasToGrid(canvasPos.x, canvasPos.y);

    console.log(
      `Teste conversão - Grid: (${testGridPos.col}, ${testGridPos.row})`
    );
    console.log(
      `Canvas: (${canvasPos.x.toFixed(1)}, ${canvasPos.y.toFixed(1)})`
    );
    console.log(`De volta ao Grid: (${backToGrid.col}, ${backToGrid.row})`);
    // Verificar posições das torres
    console.log("🏰 Posições das torres:");

    // Torres inimigas
    const enemyKingPos = this.getGridPosition(this.gridCols / 2, 1);
    const enemyLeftPos = this.getGridPosition(this.gridCols / 4, 3);
    const enemyRightPos = this.getGridPosition((this.gridCols * 3) / 4, 3);

    // Torres do jogador
    const playerKingPos = this.getGridPosition(
      this.gridCols / 2,
      this.gridRows - 1
    );
    const playerLeftPos = this.getGridPosition(
      this.gridCols / 4,
      this.gridRows - 3
    );
    const playerRightPos = this.getGridPosition(
      (this.gridCols * 3) / 4,
      this.gridRows - 3
    );

    console.log(
      `Torre Rei Inimiga: (${enemyKingPos.x.toFixed(
        1
      )}, ${enemyKingPos.y.toFixed(1)})`
    );
    console.log(
      `Torre Rei Jogador: (${playerKingPos.x.toFixed(
        1
      )}, ${playerKingPos.y.toFixed(1)})`
    );
    console.log(
      `Primeira posição caminho esquerdo: (${this.leftPath[0].x.toFixed(
        1
      )}, ${this.leftPath[0].y.toFixed(1)})`
    );
    console.log(
      `Última posição caminho esquerdo: (${this.leftPath[
        this.leftPath.length - 1
      ].x.toFixed(1)}, ${this.leftPath[this.leftPath.length - 1].y.toFixed(1)})`
    );

    return true;
  }
}
