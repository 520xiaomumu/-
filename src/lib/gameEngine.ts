// 生命游戏核心引擎 - 负责游戏逻辑计算
// 这个文件包含了康威生命游戏的所有核心规则和计算逻辑

// 细胞的状态类型：true表示活着，false表示死亡
export type CellState = boolean;

// 游戏网格类型：二维数组，每个元素代表一个细胞的状态
export type GameGrid = CellState[][];

// 游戏模式：有限网格或无限画布
export type GameMode = 'finite' | 'infinite';

// 无限模式下的细胞坐标
export interface InfiniteCell {
  x: number; // X坐标
  y: number; // Y坐标
}

// 图案分类类型
export type PatternCategory = 'still-life' | 'oscillator' | 'spaceship' | 'gun' | 'methuselah' | 'infinite-growth';

// 无限模式下的活细胞集合（使用Map存储，key是"x,y"格式的字符串）
export type InfiniteCells = Map<string, boolean>;

// 视口信息（用于无限画布）
export interface Viewport {
  x: number;           // 视口X偏移
  y: number;           // 视口Y偏移
  zoom: number;        // 缩放级别
  cellSize: number;    // 细胞大小（像素）
}

// 游戏统计信息
export interface GameStats {
  generation: number;    // 当前世代数
  aliveCells: number;    // 活细胞数量
  runningTime: number;   // 运行时间（毫秒）
  fps: number;          // 当前帧率
  maxPopulation: number; // 最大种群数
  maxPopulationGeneration: number; // 最大种群出现的代数
}

// 图案数据结构
export interface Pattern {
  id: string;           // 唯一标识符
  name: string;         // 图案名称
  category: string;     // 图案分类
  description: string;  // 图案描述
  cells: InfiniteCell[]; // 活细胞坐标列表
  width: number;        // 图案宽度
  height: number;       // 图案高度
}

/**
 * 生命游戏引擎类
 * 负责处理游戏的核心逻辑，包括细胞状态计算、世代演进等
 */
export class GameOfLifeEngine {
  private grid: GameGrid = [];           // 有限模式的网格
  private infiniteCells: InfiniteCells = new Map(); // 无限模式的细胞
  private mode: GameMode = 'finite';     // 当前游戏模式
  private rows = 30;                     // 网格行数
  private cols = 40;                     // 网格列数
  private generation = 0;                // 当前世代
  private startTime = 0;                 // 游戏开始时间
  private lastFrameTime = 0;             // 上一帧时间
  private frameCount = 0;                // 帧计数
  private currentFPS = 0;                // 当前FPS
  private maxPopulation = 0;             // 最大种群数
  private maxPopulationGeneration = 0;   // 最大种群出现的代数
  private viewport: Viewport = {         // 无限模式视口
    x: 0,
    y: 0,
    zoom: 1,
    cellSize: 20
  };

  constructor(rows = 30, cols = 40, mode: GameMode = 'finite') {
    this.rows = rows;
    this.cols = cols;
    this.mode = mode;
    this.initializeGrid();
  }

  /**
   * 初始化游戏网格
   * 创建一个全部为死细胞的网格
   */
  private initializeGrid(): void {
    this.grid = Array(this.rows).fill(null).map(() => 
      Array(this.cols).fill(false)
    );
  }

  /**
   * 获取当前游戏模式
   */
  getMode(): GameMode {
    return this.mode;
  }

  /**
   * 切换游戏模式
   */
  setMode(mode: GameMode): void {
    this.mode = mode;
    if (mode === 'finite') {
      this.initializeGrid();
    } else {
      this.infiniteCells.clear();
    }
    this.generation = 0;
  }

  /**
   * 获取网格尺寸
   */
  getGridSize(): { rows: number; cols: number } {
    return { rows: this.rows, cols: this.cols };
  }

  /**
   * 设置网格尺寸（仅限有限模式）
   */
  setGridSize(rows: number, cols: number): void {
    this.rows = rows;
    this.cols = cols;
    if (this.mode === 'finite') {
      this.initializeGrid();
    }
    this.generation = 0;
  }

  /**
   * 获取有限模式的完整网格
   */
  getGrid(): GameGrid {
    return this.grid;
  }

  /**
   * 获取无限模式的活细胞
   */
  getInfiniteCells(): InfiniteCells {
    return this.infiniteCells;
  }

  /**
   * 设置单个细胞的状态（有限模式）
   */
  setCellState(row: number, col: number, alive: boolean): void {
    if (this.mode === 'finite' && this.isValidPosition(row, col)) {
      this.grid[row][col] = alive;
    }
  }

  /**
   * 获取单个细胞的状态（有限模式）
   */
  getCellState(row: number, col: number): boolean {
    if (this.mode === 'finite' && this.isValidPosition(row, col)) {
      return this.grid[row][col];
    }
    return false;
  }

  /**
   * 设置无限模式下的细胞状态
   */
  setInfiniteCell(x: number, y: number, alive: boolean): void {
    const key = `${x},${y}`;
    if (alive) {
      this.infiniteCells.set(key, true);
    } else {
      this.infiniteCells.delete(key);
    }
  }

  /**
   * 获取无限模式下的细胞状态
   */
  getInfiniteCell(x: number, y: number): boolean {
    return this.infiniteCells.has(`${x},${y}`);
  }

  /**
   * 检查坐标是否在有效范围内
   */
  private isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  /**
   * 计算有限模式下某个细胞的邻居数量
   */
  private countNeighbors(row: number, col: number): number {
    let count = 0;
    // 检查周围8个方向的邻居
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue; // 跳过自己
        const newRow = row + dr;
        const newCol = col + dc;
        if (this.isValidPosition(newRow, newCol) && this.grid[newRow][newCol]) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * 计算无限模式下某个细胞的邻居数量
   */
  private countInfiniteNeighbors(x: number, y: number): number {
    let count = 0;
    // 检查周围8个方向的邻居
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // 跳过自己
        if (this.getInfiniteCell(x + dx, y + dy)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * 应用生命游戏规则
   * @param isAlive 当前细胞是否存活
   * @param neighbors 邻居数量
   * @param survivalRules 存活规则数组 (默认: [2, 3])
   * @param birthRules 诞生规则数组 (默认: [3])
   */
  private applyRules(
    isAlive: boolean, 
    neighbors: number, 
    survivalRules: number[] = [2, 3], 
    birthRules: number[] = [3]
  ): boolean {
    if (isAlive) {
      // 活细胞：邻居数在存活规则中时继续存活
      return survivalRules.includes(neighbors);
    } else {
      // 死细胞：邻居数在诞生规则中时复活
      return birthRules.includes(neighbors);
    }
  }

  /**
   * 执行一步演化（有限模式）
   */
  private stepFinite(survivalRules?: number[], birthRules?: number[]): void {
    const newGrid: GameGrid = Array(this.rows).fill(null).map(() => 
      Array(this.cols).fill(false)
    );

    // 遍历每个细胞，计算下一代状态
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const neighbors = this.countNeighbors(row, col);
        const currentState = this.grid[row][col];
        newGrid[row][col] = this.applyRules(currentState, neighbors, survivalRules, birthRules);
      }
    }

    this.grid = newGrid;
  }

  /**
   * 执行一步演化（无限模式）
   */
  private stepInfinite(survivalRules?: number[], birthRules?: number[]): void {
    const newCells: InfiniteCells = new Map();
    const cellsToCheck = new Set<string>();

    // 收集所有需要检查的细胞（活细胞及其邻居）
    for (const [key] of this.infiniteCells) {
      const [x, y] = key.split(',').map(Number);
      
      // 添加当前细胞和其所有邻居到检查列表
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          cellsToCheck.add(`${x + dx},${y + dy}`);
        }
      }
    }

    // 检查每个细胞的下一代状态
    for (const key of cellsToCheck) {
      const [x, y] = key.split(',').map(Number);
      const neighbors = this.countInfiniteNeighbors(x, y);
      const currentState = this.getInfiniteCell(x, y);
      const newState = this.applyRules(currentState, neighbors, survivalRules, birthRules);
      
      if (newState) {
        newCells.set(key, true);
      }
    }

    this.infiniteCells = newCells;
  }

  /**
   * 执行一步演化
   * @param survivalRules 存活规则数组 (可选)
   * @param birthRules 诞生规则数组 (可选)
   */
  step(survivalRules?: number[], birthRules?: number[]): void {
    if (this.mode === 'finite') {
      this.stepFinite(survivalRules, birthRules);
    } else {
      this.stepInfinite(survivalRules, birthRules);
    }
    this.generation++;
    this.updateFPS();
  }

  /**
   * 更新FPS计算
   */
  private updateFPS(): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const deltaTime = now - this.lastFrameTime;
      this.currentFPS = Math.round(1000 / deltaTime);
    }
    this.lastFrameTime = now;
    this.frameCount++;
  }

  /**
   * 重置游戏状态
   */
  reset(): void {
    if (this.mode === 'finite') {
      this.initializeGrid();
    } else {
      this.infiniteCells.clear();
    }
    this.generation = 0;
    this.startTime = performance.now();
    this.frameCount = 0;
    this.currentFPS = 0;
    this.maxPopulation = 0;
    this.maxPopulationGeneration = 0;
  }

  /**
   * 随机化网格（仅限有限模式）
   */
  randomize(probability = 0.3): void {
    if (this.mode === 'finite') {
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          this.grid[row][col] = Math.random() < probability;
        }
      }
    }
    this.generation = 0;
  }

  /**
   * 获取游戏统计信息
   */
  getStats(): GameStats {
    const aliveCells = this.mode === 'finite' 
      ? this.grid.flat().filter(cell => cell).length
      : this.infiniteCells.size;
    
    const runningTime = this.startTime > 0 
      ? performance.now() - this.startTime 
      : 0;

    // 更新最大种群统计
    if (aliveCells > this.maxPopulation) {
      this.maxPopulation = aliveCells;
      this.maxPopulationGeneration = this.generation;
    }

    return {
      generation: this.generation,
      aliveCells,
      runningTime,
      fps: this.currentFPS,
      maxPopulation: this.maxPopulation,
      maxPopulationGeneration: this.maxPopulationGeneration
    };
  }

  /**
   * 开始计时
   */
  startTimer(): void {
    this.startTime = performance.now();
  }

  /**
   * 停止计时
   */
  stopTimer(): void {
    // 停止计时，重置相关状态
    this.currentFPS = 0;
    this.lastFrameTime = 0;
  }

  /**
   * 获取当前世代数
   */
  getGeneration(): number {
    return this.generation;
  }

  /**
   * 设置当前世代数 - 用于撤回功能恢复代数
   */
  setGeneration(generation: number): void {
    this.generation = Math.max(0, generation); // 确保代数不为负数
  }

  /**
   * 清空指定区域的细胞
   */
  clearArea(startRow: number, startCol: number, endRow: number, endCol: number): void {
    if (this.mode === 'finite') {
      for (let row = Math.max(0, startRow); row <= Math.min(this.rows - 1, endRow); row++) {
        for (let col = Math.max(0, startCol); col <= Math.min(this.cols - 1, endCol); col++) {
          this.grid[row][col] = false;
        }
      }
    }
  }

  /**
   * 在指定位置放置图案
   */
  placePattern(pattern: Pattern, startRow: number, startCol: number): void {
    if (this.mode === 'finite') {
      // 有限模式：转换坐标并放置
      pattern.cells.forEach(cell => {
        const row = startRow + cell.y;
        const col = startCol + cell.x;
        if (this.isValidPosition(row, col)) {
          this.grid[row][col] = true;
        }
      });
    } else {
      // 无限模式：直接放置
      pattern.cells.forEach(cell => {
        this.setInfiniteCell(startCol + cell.x, startRow + cell.y, true);
      });
    }
  }

  /**
   * 获取视口信息
   */
  getViewport(): Viewport {
    return { ...this.viewport };
  }

  /**
   * 设置视口位置
   */
  setViewportPosition(x: number, y: number): void {
    this.viewport.x = x;
    this.viewport.y = y;
  }

  /**
   * 设置视口缩放
   */
  setViewportZoom(zoom: number): void {
    this.viewport.zoom = Math.max(0.1, Math.min(10, zoom));
  }

  /**
   * 设置细胞大小
   */
  setCellSize(size: number): void {
    this.viewport.cellSize = Math.max(1, Math.min(100, size));
  }

  /**
   * 重置视口
   */
  resetViewport(): void {
    this.viewport = {
      x: 0,
      y: 0,
      zoom: 1,
      cellSize: 20
    };
  }

  /**
   * 屏幕坐标转世界坐标
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = Math.floor((screenX - this.viewport.x) / (this.viewport.cellSize * this.viewport.zoom));
    const worldY = Math.floor((screenY - this.viewport.y) / (this.viewport.cellSize * this.viewport.zoom));
    return { x: worldX, y: worldY };
  }

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const screenX = worldX * this.viewport.cellSize * this.viewport.zoom + this.viewport.x;
    const screenY = worldY * this.viewport.cellSize * this.viewport.zoom + this.viewport.y;
    return { x: screenX, y: screenY };
  }

  /**
   * 获取可见区域内的细胞
   */
  getVisibleCells(canvasWidth: number, canvasHeight: number): InfiniteCell[] {
    if (this.mode !== 'infinite') return [];

    const cellSize = this.viewport.cellSize * this.viewport.zoom;
    const startX = Math.floor(-this.viewport.x / cellSize) - 1;
    const startY = Math.floor(-this.viewport.y / cellSize) - 1;
    const endX = Math.floor((canvasWidth - this.viewport.x) / cellSize) + 1;
    const endY = Math.floor((canvasHeight - this.viewport.y) / cellSize) + 1;

    const visibleCells: InfiniteCell[] = [];
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        if (this.getInfiniteCell(x, y)) {
          visibleCells.push({ x, y });
        }
      }
    }

    return visibleCells;
  }
}

/**
 * 创建游戏引擎实例的工厂函数
 */
export function createGameEngine(rows = 30, cols = 40, mode: GameMode = 'finite'): GameOfLifeEngine {
  return new GameOfLifeEngine(rows, cols, mode);
}