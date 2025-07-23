// 全局状态管理 - 使用Zustand管理游戏状态
// 这个文件包含了整个应用的状态管理逻辑

import { create } from 'zustand';
import { GameOfLifeEngine, GameMode, GameStats, Pattern, Viewport } from './gameEngine';
import { patterns } from './patterns';

// 游戏状态接口
interface GameState {
  // 游戏引擎实例
  engine: GameOfLifeEngine;
  
  // 游戏运行状态
  isRunning: boolean;          // 游戏是否正在运行
  isPaused: boolean;           // 游戏是否暂停
  speed: number;               // 游戏速度（毫秒间隔）
  
  // 游戏模式和设置
  mode: GameMode;              // 当前游戏模式
  
  // 自定义规则
  survivalRules: number[];     // 存活规则数组
  birthRules: number[];        // 诞生规则数组
  
  // 绘图和交互状态
  isDrawing: boolean;          // 是否处于绘图模式
  selectedPattern: Pattern | null; // 当前选中的图案
  
  // 选择区域相关（新增）
  isSelecting: boolean;        // 是否处于选择模式
  selectionStart: { row: number; col: number } | null; // 选择起始位置
  selectionEnd: { row: number; col: number } | null;   // 选择结束位置
  copiedPattern: { cells: { x: number; y: number }[]; width: number; height: number } | null; // 复制的图案
  
  // 历史记录（用于撤销功能）
  history: string[];           // 游戏状态历史
  historyIndex: number;        // 当前历史索引
  maxHistorySize: number;      // 最大历史记录数量
  
  // 演化历史（用于退回到上一代）
  generationHistory: string[]; // 每一代的状态历史
  currentGenerationIndex: number; // 当前代数索引
  hasUserOperations: boolean;  // 是否有用户操作（用于判断撤回类型）
  
  // 统计信息
  stats: GameStats;            // 游戏统计数据
  
  // UI状态
  showPatternLibrary: boolean; // 是否显示图案库
  showSettings: boolean;       // 是否显示设置面板
  showHelp: boolean;           // 是否显示帮助
  
  // 移动端适配
  isMobile: boolean;           // 是否为移动设备
  touchMode: boolean;          // 是否启用触摸模式
  
  // 视口管理（无限模式）
  viewport: Viewport;          // 视口状态
}

// 游戏操作接口
interface GameActions {
  // 游戏控制
  play: () => void;            // 开始游戏
  pause: () => void;           // 暂停游戏
  stop: () => void;            // 停止游戏
  step: () => void;            // 单步执行
  reset: () => void;           // 重置游戏
  randomize: () => void;       // 随机化网格
  
  // 速度控制
  setSpeed: (speed: number) => void; // 设置游戏速度
  
  // 模式切换
  switchMode: (mode: GameMode) => void; // 切换游戏模式
  setMode: (mode: GameMode) => void; // 设置游戏模式
  setGridSize: (rows: number, cols: number) => void; // 设置网格尺寸
  
  // 自定义规则
  setSurvivalRules: (rules: number[]) => void; // 设置存活规则
  setBirthRules: (rules: number[]) => void; // 设置诞生规则
  setCustomRules: (survival: number[], birth: number[]) => void; // 同时设置两个规则
  
  // 细胞操作
  toggleCell: (row: number, col: number) => void; // 切换细胞状态
  setCellState: (row: number, col: number, state: boolean) => void; // 设置细胞状态
  
  // 无限模式操作
  setInfiniteCell: (x: number, y: number, state: boolean) => void;
  
  // 绘图模式
  toggleDrawing: () => void;   // 切换绘图模式
  
  // 选择区域操作（新增）
  startSelection: (row: number, col: number) => void; // 开始选择
  updateSelection: (row: number, col: number) => void; // 更新选择区域
  endSelection: () => void;    // 结束选择
  clearSelection: () => void;  // 清除选择
  copySelection: () => void;   // 复制选择区域
  deleteSelection: () => void; // 删除选择区域
  rotateSelection: () => void; // 旋转选择区域
  flipSelectionHorizontal: () => void; // 水平翻转选择区域
  flipSelectionVertical: () => void;   // 垂直翻转选择区域
  pastePattern: (row: number, col: number) => void; // 粘贴图案
  
  // 图案操作
  selectPattern: (pattern: Pattern | null) => void; // 选择图案
  setSelectedPattern: (pattern: Pattern | null) => void; // 设置选中图案
  setCopiedPattern: (pattern: { cells: { x: number; y: number }[]; width: number; height: number } | null) => void; // 设置复制图案
  placePattern: (pattern: Pattern, x: number, y: number) => void; // 放置图案
  
  // 历史记录
  saveToHistory: () => void;   // 保存当前状态到历史
  undo: () => void;            // 撤销
  redo: () => void;            // 重做
  
  // 演化历史管理
  saveGenerationToHistory: () => void; // 保存当前代到演化历史
  undoOrStepBack: () => void;  // 智能撤回：撤回操作或退回上一代
  markUserOperation: () => void; // 标记用户操作
  
  // 统计更新
  updateStats: () => void;     // 更新统计信息
  
  // UI控制
  togglePatternLibrary: () => void; // 切换图案库显示
  setShowPatternLibrary: (show: boolean) => void; // 设置图案库显示
  toggleSettings: () => void;       // 切换设置面板显示
  setShowSettings: (show: boolean) => void; // 设置设置面板显示
  toggleHelp: () => void;           // 切换帮助显示
  setShowHelp: (show: boolean) => void; // 设置帮助显示
  
  // 移动端适配
  setMobile: (mobile: boolean) => void; // 设置移动设备状态
  setTouchMode: (touchMode: boolean) => void; // 设置触摸模式
  
  // 视口管理
  setViewportPosition: (x: number, y: number) => void; // 设置视口位置
  setViewportZoom: (zoom: number) => void; // 设置视口缩放
  setCellSize: (size: number) => void; // 设置细胞大小
  resetViewport: () => void; // 重置视口
  updateViewport: () => void; // 更新视口状态
  
  // 初始化
  initialize: () => void;      // 初始化游戏
  initializeEngine: () => void; // 初始化引擎
}

// 完整的Store类型
type GameStore = GameState & GameActions;

// 创建游戏状态管理store
export const useGameStore = create<GameStore>((set, get) => {
  // 创建初始游戏引擎
  const initialEngine = new GameOfLifeEngine(30, 40, 'finite');
  
  return {
    // 初始状态
    engine: initialEngine,
    isRunning: false,
    isPaused: false,
    speed: 5, // 默认5世代/秒
    mode: 'finite' as GameMode,
    survivalRules: [2, 3], // 默认康威规则：2-3个邻居存活
    birthRules: [3], // 默认康威规则：3个邻居诞生
    isDrawing: false,
    selectedPattern: null,
    
    // 选择区域相关（新增）
    isSelecting: false,
    selectionStart: null,
    selectionEnd: null,
    copiedPattern: null,
    
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,
    generationHistory: [],
    currentGenerationIndex: -1,
    hasUserOperations: false,
    stats: {
      generation: 0,
      aliveCells: 0,
      runningTime: 0,
      fps: 0,
      maxPopulation: 0,
      maxPopulationGeneration: 0
    },
    showPatternLibrary: false,
    showSettings: false,
    showHelp: false,
    isMobile: false,
    touchMode: false,
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
      cellSize: 20
    },
    
    // 游戏控制操作
    // 播放游戏 - 让小朋友看到生命游戏开始运行
    play: () => {
      const { engine } = get();
      engine.startTimer();
      set({ isRunning: true, isPaused: false });
    },
    
    // 暂停游戏 - 修复暂停bug，确保游戏能正确停止
    pause: () => {
      const { engine } = get();
      engine.stopTimer();
      set({ isRunning: false, isPaused: true });
    },
    
    // 停止游戏 - 完全停止游戏运行
    stop: () => {
      const { engine } = get();
      engine.stopTimer();
      set({ isRunning: false, isPaused: false });
    },
    
    step: () => {
      const { engine, updateStats, survivalRules, birthRules, saveGenerationToHistory } = get();
      // 在演化前保存当前状态到演化历史
      saveGenerationToHistory();
      engine.step(survivalRules, birthRules);
      updateStats();
      // 演化后重置用户操作标记
      set({ hasUserOperations: false });
    },
    
    reset: () => {
      const { engine, updateStats } = get();
      engine.reset();
      updateStats();
      set({ 
        isRunning: false, 
        isPaused: false,
        history: [],
        historyIndex: -1,
        generationHistory: [],
        currentGenerationIndex: -1,
        hasUserOperations: false
      });
    },
    
    randomize: () => {
      const { engine, updateStats, saveToHistory, markUserOperation } = get();
      saveToHistory();
      markUserOperation();
      engine.randomize(0.3); // 30%的概率生成活细胞
      updateStats();
    },
    
    // 速度控制 - 改为世代/秒的方式
    setSpeed: (speed: number) => {
      // 限制在1-100世代/秒之间
      const generationsPerSecond = Math.max(1, Math.min(100, speed));
      set({ speed: generationsPerSecond }); // 存储世代/秒值
      
      // 如果游戏正在运行，更新游戏循环速度
      updateGameLoopSpeed(generationsPerSecond);
    },
    
    // 模式切换
    switchMode: (mode: GameMode) => {
      const { engine, updateStats } = get();
      engine.setMode(mode);
      updateStats();
      set({ 
        mode,
        history: [],
        historyIndex: -1
      });
    },
    
    setMode: (mode: GameMode) => {
      const { engine, updateStats } = get();
      engine.setMode(mode);
      updateStats();
      set({ 
        mode,
        history: [],
        historyIndex: -1
      });
    },
    
    setGridSize: (rows: number, cols: number) => {
      const { engine, updateStats } = get();
      engine.setGridSize(rows, cols);
      updateStats();
      set({ 
        history: [],
        historyIndex: -1
      });
    },
    
    // 自定义规则设置
    setSurvivalRules: (rules: number[]) => {
      set({ survivalRules: rules });
    },
    
    setBirthRules: (rules: number[]) => {
      set({ birthRules: rules });
    },
    
    setCustomRules: (survival: number[], birth: number[]) => {
      set({ survivalRules: survival, birthRules: birth });
    },
    
    // 细胞操作
    toggleCell: (row: number, col: number) => {
      const { engine, updateStats, saveToHistory, markUserOperation } = get();
      saveToHistory();
      markUserOperation();
      const currentState = engine.getCellState(row, col);
      engine.setCellState(row, col, !currentState);
      updateStats();
    },
    
    setCellState: (row: number, col: number, alive: boolean) => {
      const { engine, updateStats } = get();
      engine.setCellState(row, col, alive);
      updateStats();
    },
    
    // 无限模式操作
    setInfiniteCell: (x: number, y: number, alive: boolean) => {
      const { engine, updateStats } = get();
      engine.setInfiniteCell(x, y, alive);
      updateStats();
    },
    
    // 绘图模式
    toggleDrawing: () => {
      set(state => ({ isDrawing: !state.isDrawing }));
    },
    
    // 选择区域操作（新增）
    startSelection: (row: number, col: number) => {
      set({ 
        isSelecting: true, 
        selectionStart: { row, col }, 
        selectionEnd: { row, col } 
      });
    },
    
    updateSelection: (row: number, col: number) => {
      const { isSelecting } = get();
      if (isSelecting) {
        set({ selectionEnd: { row, col } });
      }
    },
    
    endSelection: () => {
      set({ isSelecting: false });
    },
    
    clearSelection: () => {
      set({ 
        isSelecting: false, 
        selectionStart: null, 
        selectionEnd: null 
      });
    },
    
    copySelection: () => {
      const { engine, selectionStart, selectionEnd } = get();
      if (!selectionStart || !selectionEnd) return;
      
      const minRow = Math.min(selectionStart.row, selectionEnd.row);
      const maxRow = Math.max(selectionStart.row, selectionEnd.row);
      const minCol = Math.min(selectionStart.col, selectionEnd.col);
      const maxCol = Math.max(selectionStart.col, selectionEnd.col);
      
      const cells: { x: number; y: number }[] = [];
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          if (engine.getCellState(row, col)) {
            cells.push({ x: col - minCol, y: row - minRow });
          }
        }
      }
      
      set({ 
        copiedPattern: {
          cells,
          width: maxCol - minCol + 1,
          height: maxRow - minRow + 1
        }
      });
    },
    
    deleteSelection: () => {
      const { engine, selectionStart, selectionEnd, saveToHistory, markUserOperation, updateStats } = get();
      if (!selectionStart || !selectionEnd) return;
      
      saveToHistory();
      markUserOperation();
      
      const minRow = Math.min(selectionStart.row, selectionEnd.row);
      const maxRow = Math.max(selectionStart.row, selectionEnd.row);
      const minCol = Math.min(selectionStart.col, selectionEnd.col);
      const maxCol = Math.max(selectionStart.col, selectionEnd.col);
      
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          engine.setCellState(row, col, false);
        }
      }
      
      updateStats();
    },
    
    rotateSelection: () => {
      const { copiedPattern } = get();
      if (!copiedPattern) return;
      
      const rotatedCells = copiedPattern.cells.map(cell => ({
        x: copiedPattern.height - 1 - cell.y,
        y: cell.x
      }));
      
      set({ 
        copiedPattern: {
          cells: rotatedCells,
          width: copiedPattern.height,
          height: copiedPattern.width
        }
      });
    },
    
    flipSelectionHorizontal: () => {
      const { copiedPattern } = get();
      if (!copiedPattern) return;
      
      const flippedCells = copiedPattern.cells.map(cell => ({
        x: copiedPattern.width - 1 - cell.x,
        y: cell.y
      }));
      
      set({ 
        copiedPattern: {
          ...copiedPattern,
          cells: flippedCells
        }
      });
    },
    
    flipSelectionVertical: () => {
      const { copiedPattern } = get();
      if (!copiedPattern) return;
      
      const flippedCells = copiedPattern.cells.map(cell => ({
        x: cell.x,
        y: copiedPattern.height - 1 - cell.y
      }));
      
      set({ 
        copiedPattern: {
          ...copiedPattern,
          cells: flippedCells
        }
      });
    },
    
    pastePattern: (row: number, col: number) => {
      const { engine, copiedPattern, saveToHistory, markUserOperation, updateStats } = get();
      if (!copiedPattern) return;
      
      saveToHistory();
      markUserOperation();
      
      copiedPattern.cells.forEach(cell => {
        const targetRow = row + cell.y;
        const targetCol = col + cell.x;
        const { rows, cols } = engine.getGridSize();
         if (targetRow >= 0 && targetRow < rows && 
             targetCol >= 0 && targetCol < cols) {
          engine.setCellState(targetRow, targetCol, true);
        }
      });
      
      updateStats();
    },
    
    // 图案操作
    selectPattern: (pattern: Pattern | null) => {
      set({ selectedPattern: pattern });
    },
    
    setSelectedPattern: (pattern: Pattern | null) => {
      set({ selectedPattern: pattern });
    },

    setCopiedPattern: (pattern: { cells: { x: number; y: number }[]; width: number; height: number } | null) => {
      set({ copiedPattern: pattern });
    },
    
    placePattern: (pattern: Pattern, row: number, col: number) => {
      const { engine, updateStats, saveToHistory, markUserOperation } = get();
      saveToHistory();
      markUserOperation();
      engine.placePattern(pattern, row, col);
      updateStats();
    },
    
    // 历史记录操作
    
    saveToHistory: () => {
      const { engine, history, historyIndex } = get();
      
      // 序列化当前状态
      let stateString: string;
      if (engine.getMode() === 'finite') {
        stateString = JSON.stringify({
          mode: 'finite',
          grid: engine.getGrid(),
          generation: engine.getGeneration()
        });
      } else {
        stateString = JSON.stringify({
          mode: 'infinite',
          cells: Array.from(engine.getInfiniteCells().entries()),
          generation: engine.getGeneration()
        });
      }
      
      // 添加到历史记录
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(stateString);
      
      // 限制历史记录数量（最多50个）
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      set({ 
        history: newHistory, 
        historyIndex: newHistory.length - 1 
      });
    },
    
    undo: () => {
      const { history, historyIndex, engine, updateStats } = get();
      
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        const stateString = history[newIndex];
        
        try {
          const state = JSON.parse(stateString);
          
          if (state.mode === 'finite') {
            engine.setMode('finite');
            // 恢复网格状态
            const grid = engine.getGrid();
            for (let row = 0; row < grid.length; row++) {
              for (let col = 0; col < grid[row].length; col++) {
                engine.setCellState(row, col, state.grid[row]?.[col] || false);
              }
            }
          } else {
            engine.setMode('infinite');
            // 恢复无限模式状态
            const cells = engine.getInfiniteCells();
            cells.clear();
            state.cells.forEach(([key, value]: [string, boolean]) => {
              cells.set(key, value);
            });
          }
          
          // 恢复代数 - 修复撤回时代数清零的问题
          if (typeof state.generation === 'number') {
            engine.setGeneration(state.generation);
          }
          
          updateStats();
          set({ historyIndex: newIndex });
        } catch (error) {
          console.error('撤销操作失败:', error);
        }
      }
    },
    
    redo: () => {
      const { history, historyIndex, engine, updateStats } = get();
      
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        const stateString = history[newIndex];
        
        try {
          const state = JSON.parse(stateString);
          
          if (state.mode === 'finite') {
            engine.setMode('finite');
            // 恢复网格状态
            const grid = engine.getGrid();
            for (let row = 0; row < grid.length; row++) {
              for (let col = 0; col < grid[row].length; col++) {
                engine.setCellState(row, col, state.grid[row]?.[col] || false);
              }
            }
          } else {
            engine.setMode('infinite');
            // 恢复无限模式状态
            const cells = engine.getInfiniteCells();
            cells.clear();
            state.cells.forEach(([key, value]: [string, boolean]) => {
              cells.set(key, value);
            });
          }
          
          // 恢复代数 - 修复重做时代数清零的问题
          if (typeof state.generation === 'number') {
            engine.setGeneration(state.generation);
          }
          
          updateStats();
          set({ historyIndex: newIndex });
        } catch (error) {
          console.error('重做操作失败:', error);
        }
      }
    },
    
    // 演化历史管理
    saveGenerationToHistory: () => {
      const { engine, generationHistory, currentGenerationIndex } = get();
      
      // 序列化当前状态
      let stateString: string;
      if (engine.getMode() === 'finite') {
        stateString = JSON.stringify({
          mode: 'finite',
          grid: engine.getGrid(),
          generation: engine.getGeneration()
        });
      } else {
        stateString = JSON.stringify({
          mode: 'infinite',
          cells: Array.from(engine.getInfiniteCells().entries()),
          generation: engine.getGeneration()
        });
      }
      
      // 添加到演化历史记录
      const newHistory = generationHistory.slice(0, currentGenerationIndex + 1);
      newHistory.push(stateString);
      
      // 限制演化历史记录数量（最多30个）
      if (newHistory.length > 30) {
        newHistory.shift();
      }
      
      set({ 
        generationHistory: newHistory, 
        currentGenerationIndex: newHistory.length - 1 
      });
    },
    
    // 智能撤回：撤回操作或退回上一代
    undoOrStepBack: () => {
      const { hasUserOperations, undo, generationHistory, currentGenerationIndex, engine, updateStats } = get();
      
      // 如果有用户操作，优先撤回操作
      if (hasUserOperations) {
        undo();
        return;
      }
      
      // 如果没有用户操作，尝试退回到上一代
      if (currentGenerationIndex > 0) {
        const newIndex = currentGenerationIndex - 1;
        const stateString = generationHistory[newIndex];
        
        try {
          const state = JSON.parse(stateString);
          
          if (state.mode === 'finite') {
            engine.setMode('finite');
            // 恢复网格状态
            const grid = engine.getGrid();
            for (let row = 0; row < grid.length; row++) {
              for (let col = 0; col < grid[row].length; col++) {
                engine.setCellState(row, col, state.grid[row]?.[col] || false);
              }
            }
          } else {
            engine.setMode('infinite');
            // 恢复无限模式状态
            const cells = engine.getInfiniteCells();
            cells.clear();
            state.cells.forEach(([key, value]: [string, boolean]) => {
              cells.set(key, value);
            });
          }
          
          // 恢复代数 - 修复撤回时代数清零的问题
          if (typeof state.generation === 'number') {
            engine.setGeneration(state.generation);
          }
          
          updateStats();
          set({ currentGenerationIndex: newIndex });
        } catch (error) {
          console.error('退回上一代失败:', error);
        }
      }
    },
    
    // 标记用户操作
    markUserOperation: () => {
      set({ hasUserOperations: true });
    },
    
    // 统计更新
    updateStats: () => {
      const { engine } = get();
      const stats = engine.getStats();
      set({ stats });
    },
    
    // UI控制
    togglePatternLibrary: () => {
      set(state => ({ showPatternLibrary: !state.showPatternLibrary }));
    },
    
    setShowPatternLibrary: (show: boolean) => {
      set({ showPatternLibrary: show });
    },
    
    toggleSettings: () => {
      set(state => ({ showSettings: !state.showSettings }));
    },
    
    setShowSettings: (show: boolean) => {
      set({ showSettings: show });
    },
    
    toggleHelp: () => {
      set(state => ({ showHelp: !state.showHelp }));
    },
    
    setShowHelp: (show: boolean) => {
      set({ showHelp: show });
    },
    
    // 移动端适配
    setMobile: (isMobile: boolean) => {
      set({ isMobile });
    },
    
    setTouchMode: (touchMode: boolean) => {
      set({ touchMode });
    },
    
    // 视口管理
    setViewportPosition: (x: number, y: number) => {
      const { engine } = get();
      engine.setViewportPosition(x, y);
      set({ viewport: engine.getViewport() });
    },
    
    setViewportZoom: (zoom: number) => {
      const { engine } = get();
      engine.setViewportZoom(zoom);
      set({ viewport: engine.getViewport() });
    },
    
    setCellSize: (size: number) => {
      const { engine } = get();
      engine.setCellSize(size);
      set({ viewport: engine.getViewport() });
    },
    
    resetViewport: () => {
      const { engine } = get();
      engine.resetViewport();
      set({ viewport: engine.getViewport() });
    },
    
    updateViewport: () => {
      const { engine } = get();
      set({ viewport: engine.getViewport() });
    },
    
    // 初始化
    initialize: () => {
      const { updateStats } = get();
      
      // 检测是否为移动设备
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      
      // 检测触摸支持
      const touchMode = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      set({ isMobile, touchMode });
      updateStats();
      
      // 如果是移动设备，调整默认网格大小
      if (isMobile) {
        const { setGridSize } = get();
        setGridSize(20, 25); // 移动设备使用较小的网格
      }
    },
    
    initializeEngine: () => {
      const { updateStats } = get();
      updateStats();
    }
  };
});

// 游戏循环管理
let gameInterval: NodeJS.Timeout | null = null;

/**
 * 启动游戏循环
 */
export function startGameLoop() {
  const { isRunning, isPaused, speed, step } = useGameStore.getState();
  
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  
  // 将世代/秒转换为毫秒间隔
  const intervalMs = Math.max(10, Math.round(1000 / speed));
  
  gameInterval = setInterval(() => {
    const currentState = useGameStore.getState();
    
    if (currentState.isRunning && !currentState.isPaused) {
      currentState.step();
    }
  }, intervalMs);
}

/**
 * 停止游戏循环
 */
export function stopGameLoop() {
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
}

/**
 * 更新游戏循环速度
 */
export function updateGameLoopSpeed(speed: number) {
  const { isRunning } = useGameStore.getState();
  
  if (isRunning && gameInterval) {
    stopGameLoop();
    startGameLoop();
  }
}

// 监听状态变化
let previousSpeed = 2;
let previousRunning = false;
let previousPaused = false;

useGameStore.subscribe((state) => {
  // 监听速度变化
  if (state.speed !== previousSpeed) {
    previousSpeed = state.speed;
    updateGameLoopSpeed(state.speed);
  }
  
  // 监听游戏运行状态变化
  if (state.isRunning !== previousRunning || state.isPaused !== previousPaused) {
    previousRunning = state.isRunning;
    previousPaused = state.isPaused;
    
    if (state.isRunning && !state.isPaused) {
      startGameLoop();
    } else {
      stopGameLoop();
    }
  }
});