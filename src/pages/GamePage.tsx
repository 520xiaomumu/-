// 主游戏页面 - 整合所有游戏功能组件
// 包括游戏网格、控制面板、图案库等核心功能

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Library, 
  HelpCircle, 
  Settings, 
  Menu, 
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Home
} from 'lucide-react';
import { useGameStore } from '../lib/store';
import { GameGrid } from '../components/GameGrid';
import { InfiniteCanvas } from '../components/InfiniteCanvas';
import { ControlPanel } from '../components/ControlPanel';
import { PatternLibrary } from '../components/PatternLibrary';
import { Pattern } from '../lib/gameEngine';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

/**
 * 主游戏页面组件
 * 整合所有游戏功能，提供完整的生命游戏体验
 */
export function GamePage() {
  // 获取游戏状态和操作函数
  const {
    engine,
    isRunning,
    mode,
    selectedPattern,
    copiedPattern,
    isMobile,
    stats,
    placePattern,
    setSelectedPattern,
    setCopiedPattern,
    updateStats,
    reset,
    pause,
    play,
    step,
    randomize,
    toggleDrawing
  } = useGameStore();

  // 页面状态
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [lastStatsUpdate, setLastStatsUpdate] = useState(Date.now());

  /**
   * 处理图案放置
   */
  const handlePatternPlace = useCallback((pattern: Pattern, row: number, col: number) => {
    try {
      placePattern(pattern, row, col); // 正确的坐标顺序
      updateStats();
      toast.success(`已放置图案: ${pattern.name}`);
      
      // 放置后清除选择（可选）
      // setSelectedPattern(null);
    } catch (error) {
      toast.error('放置图案失败，请检查位置是否合适');
      console.error('Pattern placement error:', error);
    }
  }, [placePattern, updateStats]);

  /**
   * 处理细胞点击
   */
  const handleCellClick = useCallback((row: number, col: number) => {
    updateStats();
  }, [updateStats]);

  /**
   * 处理全屏切换
   */
  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('进入全屏失败:', err);
        toast.error('无法进入全屏模式');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('退出全屏失败:', err);
      });
    }
  }, []);

  /**
   * 处理键盘快捷键
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框中，不处理快捷键
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      const { speed, setSpeed, undoOrStepBack } = useGameStore.getState();
      
      switch (e.key.toLowerCase()) {
        case ' ': // 空格键
          e.preventDefault();
          if (isRunning) {
            pause();
          } else {
            play();
          }
          break;
          
        case 'arrowright': // 右箭头键：单次演化
          e.preventDefault();
          if (e.shiftKey) {
            // Shift + 右箭头：加速
            const newSpeed = Math.min(100, speed + 5);
            setSpeed(newSpeed);
            toast.success(`速度: ${newSpeed} 世代/秒`);
          } else {
            step();
          }
          break;
          
        case 'arrowleft': // 左箭头键：智能撤回（撤回操作或退回上一代）
          e.preventDefault();
          if (e.shiftKey) {
            // Shift + 左箭头：减速
            const newSpeed = Math.max(1, speed - 5);
            setSpeed(newSpeed);
            toast.success(`速度: ${newSpeed} 世代/秒`);
          } else {
            // 左箭头：智能撤回
            const { hasUserOperations } = useGameStore.getState();
            undoOrStepBack();
            if (hasUserOperations) {
              toast.success('已撤销操作');
            } else {
              toast.success('已退回上一代');
            }
          }
          break;
          
        case 'arrowup': // 上箭头键：加速（单次+1）
          e.preventDefault();
          const newSpeedUp = Math.min(100, speed + 1);
          setSpeed(newSpeedUp);
          toast.success(`速度: ${newSpeedUp} 世代/秒`);
          break;
          
        case 'arrowdown': // 下箭头键：减速（单次-1）
          e.preventDefault();
          const newSpeedDown = Math.max(1, speed - 1);
          setSpeed(newSpeedDown);
          toast.success(`速度: ${newSpeedDown} 世代/秒`);
          break;
          
        case 'c': // C键清空
          e.preventDefault();
          reset();
          break;
          
        case 'r': // R键随机化
          e.preventDefault();
          randomize();
          break;
          
        case 'd': // D键绘图模式
          e.preventDefault();
          toggleDrawing();
          break;
          
        case 'l':
          e.preventDefault();
          setShowPatternLibrary(!showPatternLibrary);
          break;
          
        case 'h':
          e.preventDefault();
          setShowHelp(!showHelp);
          break;
          
        case 'f11':
          e.preventDefault();
          handleFullscreenToggle();
          break;
          
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleFullscreenToggle();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPatternLibrary, showHelp, handleFullscreenToggle, setSelectedPattern, isRunning, play, pause, step, reset, randomize, toggleDrawing]);

  /**
   * 监听全屏状态变化
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  /**
   * 定期更新统计信息
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning) {
        updateStats();
        setLastStatsUpdate(Date.now());
      }
    }, 1000); // 每秒更新一次
    
    return () => clearInterval(interval);
  }, [isRunning, updateStats]);

  /**
   * 页面卸载时暂停游戏
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning) {
        pause();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, pause]);

  /**
   * 渲染帮助弹窗
   */
  const renderHelpModal = () => {
    if (!showHelp) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/20 w-full max-w-2xl max-h-[80vh] overflow-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">游戏帮助</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            
            <div className="space-y-4 text-white/80">
              <section>
                <h3 className="text-lg font-semibold text-white mb-2">游戏规则</h3>
                <ul className="space-y-1 text-sm">
                  <li>• 活细胞周围有2-3个活邻居时继续存活</li>
                  <li>• 活细胞周围少于2个活邻居时死亡（孤独）</li>
                  <li>• 活细胞周围超过3个活邻居时死亡（过度拥挤）</li>
                  <li>• 死细胞周围恰好有3个活邻居时复活</li>
                </ul>
              </section>
              
              <section>
                <h3 className="text-lg font-semibold text-white mb-2">操作指南</h3>
                <ul className="space-y-1 text-sm">
                  <li>• 点击细胞切换生死状态</li>
                  <li>• 开启绘图模式后可拖拽绘制</li>
                  <li>• 从图案库选择经典图案放置</li>
                  <li>• 使用控制面板调节速度和模式</li>
                </ul>
              </section>
              
              <section>
                <h3 className="text-lg font-semibold text-white mb-2">快捷键</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>空格 - 播放/暂停</div>
                  <div>→ - 单步执行</div>
                  <div>← - 撤销操作</div>
                  <div>↑ - 加速 (+5)</div>
                  <div>↓ - 减速 (-5)</div>
                  <div>Shift+→ - 加速</div>
                  <div>Shift+← - 减速</div>
                  <div>C - 清空网格</div>
                  <div>R - 随机化</div>
                  <div>D - 绘图模式</div>
                  <div>L - 图案库</div>
                  <div>H - 帮助</div>
                  <div>F11 - 全屏</div>
                  <div>Ctrl+F - 全屏</div>
                </div>
              </section>
              
              <section>
                <h3 className="text-lg font-semibold text-white mb-2">游戏模式</h3>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>有限模式</strong>：固定大小的网格，边界外为死细胞</li>
                  <li>• <strong>无限模式</strong>：理论上无限大的网格，支持无限扩展</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * 渲染移动端菜单
   */
  const renderMobileMenu = () => {
    if (!showMobileMenu) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden">
        <div className="fixed right-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-md border-l border-white/20 p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">菜单</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowPatternLibrary(true);
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Library size={20} />
              <span>图案库</span>
            </button>
            
            <button
              onClick={() => {
                setShowHelp(true);
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <HelpCircle size={20} />
              <span>帮助</span>
            </button>
            
            <button
              onClick={() => {
                handleFullscreenToggle();
                setShowMobileMenu(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              <span>{isFullscreen ? '退出全屏' : '进入全屏'}</span>
            </button>
            
            <button
              onClick={() => {
                reset();
                setShowMobileMenu(false);
                toast.success('已重置游戏');
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
            >
              <RotateCcw size={20} />
              <span>重置游戏</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex flex-col">
      {/* 顶部导航栏 */}
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">生命游戏</h1>
            <div className="hidden sm:flex items-center gap-2 text-sm text-white/60">
              <span>模式: {mode === 'finite' ? '有限' : '无限'}</span>
              <span>•</span>
              <span>代数: {stats.generation}</span>
              <span>•</span>
              <span>活细胞: {stats.aliveCells}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 桌面端按钮 */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setShowPatternLibrary(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Library size={18} />
                <span>图案库</span>
              </button>
              
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <HelpCircle size={18} />
                <span>帮助</span>
              </button>
              
              <button
                onClick={handleFullscreenToggle}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={isFullscreen ? '退出全屏' : '进入全屏'}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
            
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setShowMobileMenu(true)}
              className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
        
        {/* 选中图案提示 */}
        {selectedPattern && (
          <div className="mt-3 flex items-center justify-between bg-green-500/20 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-400">
              <span className="text-sm font-medium">已选择图案: {selectedPattern.name}</span>
              <span className="text-xs opacity-75">点击网格放置</span>
            </div>
            <button
              onClick={() => setSelectedPattern(null)}
              className="p-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        {/* 复制图案提示 */}
        {!selectedPattern && copiedPattern && (
          <div className="mt-3 flex items-center justify-between bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-400">
              <span className="text-sm font-medium">已复制图案</span>
              <span className="text-xs opacity-75">点击网格粘贴</span>
            </div>
            <button
              onClick={() => setCopiedPattern(null)}
              className="p-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </header>
      
      {/* 主内容区域 */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* 游戏网格区域 */}
        <div className="flex-1 flex justify-center items-center">
          {mode === 'infinite' ? (
            <InfiniteCanvas
              className="w-full h-full"
              onCellClick={handleCellClick}
              onPatternPlace={handlePatternPlace}
            />
          ) : (
            <GameGrid
              className="w-full h-full"
              cellSize={isMobile ? 10 : 12}
              onCellClick={handleCellClick}
              onPatternPlace={handlePatternPlace}
            />
          )}
        </div>
        
        {/* 控制面板 */}
        <div className="lg:w-80 flex-shrink-0">
          <ControlPanel />
        </div>
      </main>
      
      {/* 弹窗组件 */}
      <PatternLibrary 
        isOpen={showPatternLibrary} 
        onClose={() => setShowPatternLibrary(false)} 
      />
      
      {renderHelpModal()}
      {renderMobileMenu()}
      
      {/* 状态指示器 */}
      {isRunning && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
          运行中 - {stats.fps.toFixed(1)} FPS
        </div>
      )}
    </div>
  );
}

export default GamePage;