import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  Shuffle, 
  Settings,
  Info,
  Grid3X3,
  Infinity,
  Paintbrush,
  MousePointer,
  Save,
  Download,
  HelpCircle
} from 'lucide-react';
import { useGameStore } from '../lib/store';
import { cn } from '../lib/utils';

export function ControlPanel() {
  const {
    engine,
    isRunning,
    speed,
    mode,
    isDrawing,
    stats,
    survivalRules,
    birthRules,
    showHelp,
    play,
    pause,
    step,
    reset,
    randomize,
    setSpeed,
    switchMode,
    toggleDrawing,
    updateStats,
    setSurvivalRules,
    setBirthRules,
    setShowHelp,
    toggleSettings
  } = useGameStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedStates, setSavedStates] = useState<Array<{name: string, data: string, timestamp: number}>>([]);
  const [customRules, setCustomRules] = useState({ 
    s: survivalRules.join(''), 
    b: birthRules.join('') 
  });

  const handlePlayPause = () => {
    if (isRunning) {
      pause();
    } else {
      play();
    }
  };

  const handleModeSwitch = () => {
    const newMode = mode === 'finite' ? 'infinite' : 'finite';
    switchMode(newMode);
  };

  const handleRandomize = () => {
    randomize();
    updateStats();
  };

  const handleReset = () => {
    reset();
    updateStats();
  };

  const handleSave = () => {
    if (!saveName.trim()) {
      alert('请输入存档名称！');
      return;
    }
    
    const gameData = {
      mode,
      grid: mode === 'finite' ? engine.getGrid() : null,
      infiniteCells: mode === 'infinite' ? Array.from(engine.getInfiniteCells().entries()) : null,
      generation: stats.generation,
      rules: customRules,
      timestamp: Date.now()
    };
    
    const newSave = {
      name: saveName,
      data: JSON.stringify(gameData),
      timestamp: Date.now()
    };
    
    const updatedSaves = [...savedStates, newSave];
    setSavedStates(updatedSaves);
    localStorage.setItem('gameOfLifeSaves', JSON.stringify(updatedSaves));
    
    setSaveName('');
    setShowSaveModal(false);
    alert(`存档 "${saveName}" 保存成功！`);
  };

  const handleLoad = (saveData: string) => {
    try {
      const data = JSON.parse(saveData);
      
      if (data.mode !== mode) {
        switchMode(data.mode);
      }
      
      if (data.mode === 'finite' && data.grid) {
        const grid = engine.getGrid();
        for (let row = 0; row < grid.length && row < data.grid.length; row++) {
          for (let col = 0; col < grid[row].length && col < data.grid[row].length; col++) {
            engine.setCellState(row, col, data.grid[row][col] || false);
          }
        }
      } else if (data.mode === 'infinite' && data.infiniteCells) {
        const cells = engine.getInfiniteCells();
        cells.clear();
        data.infiniteCells.forEach(([key, value]: [string, boolean]) => {
          cells.set(key, value);
        });
      }
      
      if (data.rules) {
        setCustomRules(data.rules);
        updateGameRules(data.rules.s, data.rules.b);
      }
      
      updateStats();
      alert('读档成功！');
    } catch (error) {
      alert('读档失败，存档文件可能已损坏！');
    }
  };

  const handleDeleteSave = (index: number) => {
    const updatedSaves = savedStates.filter((_, i) => i !== index);
    setSavedStates(updatedSaves);
    localStorage.setItem('gameOfLifeSaves', JSON.stringify(updatedSaves));
  };

  const handleExport = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const cellSize = 10;
    let canvasWidth: number, canvasHeight: number, cellPositions: Array<{x: number, y: number}>;
    
    if (mode === 'finite') {
      const grid = engine.getGrid();
      canvasWidth = grid[0].length * cellSize;
      canvasHeight = grid.length * cellSize;
      cellPositions = [];
      
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          if (grid[row][col]) {
            cellPositions.push({ x: col * cellSize, y: row * cellSize });
          }
        }
      }
    } else {
      const infiniteCells = engine.getInfiniteCells();
      if (infiniteCells.size === 0) {
        alert('画布为空，无法导出！');
        return;
      }
      
      const allCells = Array.from(infiniteCells.entries());
        const coordinates = allCells.map(([key]) => {
          const [x, y] = key.split(',').map(Number);
          return { x, y };
        });
        
        let minX = coordinates[0].x;
        let maxX = coordinates[0].x;
        let minY = coordinates[0].y;
        let maxY = coordinates[0].y;
        
        coordinates.forEach(coord => {
          if (coord.x < minX) minX = coord.x;
          if (coord.x > maxX) maxX = coord.x;
          if (coord.y < minY) minY = coord.y;
          if (coord.y > maxY) maxY = coord.y;
        });
        
        cellPositions = coordinates.map(coord => ({
          x: (coord.x - minX) * cellSize,
          y: (coord.y - minY) * cellSize
        }));
        
        canvasWidth = (maxX - minX + 1) * cellSize;
        canvasHeight = (maxY - minY + 1) * cellSize;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#00ff88';
    cellPositions.forEach(position => {
      ctx.fillRect(position.x, position.y, cellSize, cellSize);
    });
    
    const downloadLink = document.createElement('a');
    const ruleString = `B${customRules.b}/S${customRules.s}`;
    downloadLink.download = `生命游戏_第${stats.generation}代_${ruleString}.png`;
    downloadLink.href = canvas.toDataURL();
    downloadLink.click();
    
    alert('导出成功！');
  };

  const updateGameRules = (sValue: string, bValue: string) => {
    const survivalArray = sValue.split('').map(Number).filter(n => !isNaN(n));
    const birthArray = bValue.split('').map(Number).filter(n => !isNaN(n));
    
    setSurvivalRules(survivalArray);
    setBirthRules(birthArray);
    
    setCustomRules({ s: sValue, b: bValue });
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('gameOfLifeSaves');
    if (saved) {
      try {
        const parsedSaves = JSON.parse(saved);
        setSavedStates(parsedSaves);
        if (parsedSaves.length > 0) {
          setShowSettings(true);
        }
      } catch (error) {
        console.error('加载存档失败:', error);
      }
    }
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 space-y-4">
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={handlePlayPause}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
            'hover:scale-105 active:scale-95',
            {
              'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30': isRunning,
              'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30': !isRunning
            }
          )}
        >
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
          <span className="hidden sm:inline">
            {isRunning ? '暂停' : '演化'}
          </span>
        </button>

        <button
          onClick={step}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
            'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30',
            'hover:scale-105 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
          )}
        >
          <SkipForward size={18} />
          <span className="hidden sm:inline">单步</span>
        </button>

        <button
          onClick={handleReset}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
            'bg-gray-500 hover:bg-gray-600 text-white shadow-lg shadow-gray-500/30',
            'hover:scale-105 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
          )}
        >
          <Square size={18} />
          <span className="hidden sm:inline">清空</span>
        </button>

        <button
          onClick={handleRandomize}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
            'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/30',
            'hover:scale-105 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
          )}
        >
          <Shuffle size={18} />
          <span className="hidden sm:inline">随机</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => setShowSaveModal(true)}
          disabled={isRunning}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
            'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30',
            'hover:scale-105 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
          )}
        >
          <Save size={18} />
          <span className="hidden sm:inline">存档</span>
        </button>
        
        <button
          onClick={handleExport}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
            'bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/30',
            'hover:scale-105 active:scale-95'
          )}
        >
          <Download size={18} />
          <span className="hidden sm:inline">导出</span>
        </button>
        
        <button
           onClick={() => setShowHelp(true)}
           className={cn(
             'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
             'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30',
             'hover:scale-105 active:scale-95'
           )}
         >
           <HelpCircle size={18} />
           <span className="hidden sm:inline">帮助</span>
         </button>
         
         <button
           onClick={() => setShowSettings(true)}
           className={cn(
             'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
             'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30',
             'hover:scale-105 active:scale-95'
           )}
         >
           <Settings size={18} />
           <span className="hidden sm:inline">设置</span>
         </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white/80">速度</div>
          <div className="text-xs text-white/60">{speed} 世代/秒</div>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={speed}
          step="1"
          onChange={(e) => setSpeed(parseInt(e.target.value))}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="text-sm font-medium text-white/80">游戏模式</div>
          <button
            onClick={handleModeSwitch}
            disabled={isRunning}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200',
              'hover:scale-105 active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
              {
                'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30': mode === 'finite',
                'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30': mode === 'infinite'
              }
            )}
          >
            {mode === 'finite' ? <Grid3X3 size={16} /> : <Infinity size={16} />}
            <span className="text-sm">
              {mode === 'finite' ? '有限' : '无限'}
            </span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-white/80">绘图模式</div>
          <button
            onClick={toggleDrawing}
            disabled={isRunning}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200',
              'hover:scale-105 active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
              {
                'bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg shadow-yellow-500/30': isDrawing,
                'bg-white/10 hover:bg-white/20 text-white': !isDrawing
              }
            )}
          >
            {isDrawing ? <Paintbrush size={16} /> : <MousePointer size={16} />}
            <span className="text-sm">
              {isDrawing ? '绘图中' : '点击模式'}
            </span>
          </button>
        </div>
      </div>

      {showStats && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Info size={16} />
              <span>统计信息</span>
            </div>
            <button
              onClick={() => setShowStats(false)}
              className="text-white/60 hover:text-white/80 transition-colors"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/60">代数</div>
              <div className="text-white font-mono text-lg">{stats.generation}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/60">活细胞</div>
              <div className="text-white font-mono text-lg">{stats.aliveCells}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/60">最大种群</div>
              <div className="text-white font-mono text-lg">{stats.maxPopulation}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/60">最大种群代</div>
              <div className="text-white font-mono text-lg">{stats.maxPopulationGeneration}</div>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-bold mb-4">保存存档</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="输入存档名称"
              className="w-full border rounded px-3 py-2 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600"
              >
                保存
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-gray-500 text-white rounded px-4 py-2 hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 设置面板 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/20 w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">游戏设置</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <span className="text-white text-lg">×</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <section>
                  <h3 className="text-lg font-semibold text-white mb-3">游戏规则</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        存活规则 (S)
                      </label>
                      <input
                        type="text"
                        value={customRules.s}
                        onChange={(e) => {
                          const newValue = e.target.value.replace(/[^0-8]/g, '');
                          setCustomRules(prev => ({ ...prev, s: newValue }));
                          updateGameRules(newValue, customRules.b);
                        }}
                        placeholder="例如: 23"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-white/60 mt-1">
                        活细胞周围有这些数量的邻居时继续存活
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1">
                        诞生规则 (B)
                      </label>
                      <input
                        type="text"
                        value={customRules.b}
                        onChange={(e) => {
                          const newValue = e.target.value.replace(/[^0-8]/g, '');
                          setCustomRules(prev => ({ ...prev, b: newValue }));
                          updateGameRules(customRules.s, newValue);
                        }}
                        placeholder="例如: 3"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-white/60 mt-1">
                        死细胞周围有这些数量的邻居时复活
                      </p>
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-sm text-white/70">
                        当前规则: B{customRules.b}/S{customRules.s}
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        经典康威规则: B3/S23
                      </p>
                    </div>
                  </div>
                </section>
                
                <section>
                  <h3 className="text-lg font-semibold text-white mb-3">存档管理</h3>
                  {savedStates.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {savedStates.map((save, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {save.name}
                            </div>
                            <div className="text-xs text-white/60">
                              {new Date(save.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleLoad(save.data)}
                            className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                          >
                            读取
                          </button>
                          <button
                            onClick={() => handleDeleteSave(index)}
                            className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/60">暂无存档</p>
                  )}
                </section>
                
                <section>
                  <h3 className="text-lg font-semibold text-white mb-3">快捷键</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-white/80">
                    <div className="flex justify-between">
                      <span>空格</span>
                      <span className="text-white/60">播放/暂停</span>
                    </div>
                    <div className="flex justify-between">
                      <span>→</span>
                      <span className="text-white/60">单步执行</span>
                    </div>
                    <div className="flex justify-between">
                      <span>C</span>
                      <span className="text-white/60">清空网格</span>
                    </div>
                    <div className="flex justify-between">
                      <span>R</span>
                      <span className="text-white/60">随机化</span>
                    </div>
                    <div className="flex justify-between">
                      <span>D</span>
                      <span className="text-white/60">绘图模式</span>
                    </div>
                    <div className="flex justify-between">
                      <span>L</span>
                      <span className="text-white/60">图案库</span>
                    </div>
                    <div className="flex justify-between">
                      <span>H</span>
                      <span className="text-white/60">帮助</span>
                    </div>
                    <div className="flex justify-between">
                      <span>↑/↓</span>
                      <span className="text-white/60">调速度</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}