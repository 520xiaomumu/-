// 游戏网格组件 - 显示生命游戏的细胞网格
// 支持鼠标和触摸交互，包括点击、拖拽绘制等功能

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../lib/store';
import { Pattern } from '../lib/gameEngine';
import { cn } from '../lib/utils';
import ContextMenu, { ContextMenuAction } from './ContextMenu';

// 组件属性接口
interface GameGridProps {
  className?: string;           // 自定义样式类名
  cellSize?: number;           // 细胞大小（像素）
  showGrid?: boolean;          // 是否显示网格线
  onCellClick?: (row: number, col: number) => void; // 细胞点击回调
  onPatternPlace?: (pattern: Pattern, row: number, col: number) => void; // 图案放置回调
}

/**
 * 游戏网格组件
 * 负责渲染生命游戏的细胞网格，处理用户交互
 */
export function GameGrid({
  className,
  cellSize = 12,
  showGrid = true,
  onCellClick,
  onPatternPlace
}: GameGridProps) {
  // 获取游戏状态和操作函数
  const {
    engine,
    mode,
    isRunning,
    isDrawing,
    selectedPattern,
    isMobile,
    touchMode,
    isSelecting,
    selectionStart,
    selectionEnd,
    copiedPattern,
    toggleCell,
    setCellState,
    setInfiniteCell,
    updateStats,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    copySelection,
    deleteSelection,
    rotateSelection,
    flipSelectionHorizontal,
    flipSelectionVertical,
    pastePattern,
    saveToHistory,
    markUserOperation
  } = useGameStore();

  // 组件状态
  const [isDragging, setIsDragging] = useState(false);        // 是否正在拖拽
  const [dragMode, setDragMode] = useState<'draw' | 'erase'>('draw'); // 拖拽模式
  const [previewCells, setPreviewCells] = useState<{row: number, col: number}[]>([]); // 预览细胞
  const [lastDrawnCell, setLastDrawnCell] = useState<{row: number, col: number} | null>(null); // 上次绘制的细胞
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false }); // 右键菜单状态
  
  // DOM引用
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 获取网格数据
  const gridData = mode === 'finite' ? engine.getGrid() : null;
  const infiniteCells = mode === 'infinite' ? engine.getInfiniteCells() : null;
  const { rows, cols } = engine.getGridSize();

  /**
   * 获取鼠标/触摸位置对应的细胞坐标
   */
  const getCellFromPosition = useCallback((clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // 考虑网格间距（1px）
    const cellWithGap = cellSize + 1;
    const col = Math.floor(x / cellWithGap);
    const row = Math.floor(y / cellWithGap);
    
    // 检查坐标是否在有效范围内
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      return { row, col };
    }
    
    return null;
  }, [cellSize, rows, cols]);

  /**
   * 处理细胞点击
   */
  const handleCellClick = useCallback((row: number, col: number) => {
    // 如果游戏正在运行，不允许编辑
    if (isRunning) return;
    
    // 如果有选中的图案，放置图案
    if (selectedPattern) {
      onPatternPlace?.(selectedPattern, row, col);
      return;
    }
    
    // 否则切换细胞状态
    if (mode === 'finite') {
      toggleCell(row, col);
    } else {
      const currentState = engine.getInfiniteCell(col, row); // 注意坐标转换
      setInfiniteCell(col, row, !currentState);
    }
    
    onCellClick?.(row, col);
  }, [isRunning, selectedPattern, mode, toggleCell, setInfiniteCell, engine, onCellClick, onPatternPlace]);

  /**
   * 处理拖拽绘制
   */
  const handleDragDraw = useCallback((row: number, col: number) => {
    // 避免重复绘制同一个细胞
    if (lastDrawnCell && lastDrawnCell.row === row && lastDrawnCell.col === col) {
      return;
    }
    
    if (mode === 'finite') {
      const currentState = engine.getCellState(row, col);
      const newState = dragMode === 'draw' ? true : false;
      
      if (currentState !== newState) {
        setCellState(row, col, newState);
      }
    } else {
      const currentState = engine.getInfiniteCell(col, row);
      const newState = dragMode === 'draw' ? true : false;
      
      if (currentState !== newState) {
        setInfiniteCell(col, row, newState);
      }
    }
    
    setLastDrawnCell({ row, col });
  }, [lastDrawnCell, mode, dragMode, engine, setCellState, setInfiniteCell]);

  /**
   * 鼠标按下事件
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // 如果正在粘贴模式，只处理左键粘贴，右键仍可选择
    if (selectedPattern) {
      const cellPos = getCellFromPosition(e.clientX, e.clientY);
      if (cellPos && e.button === 0) {
        onPatternPlace?.(selectedPattern, cellPos.row, cellPos.col);
        return;
      }
      // 右键在粘贴模式下仍可进行选择，不return
    }
    
    // 如果有复制的图案且是左键点击，处理粘贴
    if (copiedPattern && e.button === 0) {
      const cellPos = getCellFromPosition(e.clientX, e.clientY);
      if (cellPos) {
        pastePattern(cellPos.row, cellPos.col);
        return;
      }
    }
    
    // 清除之前的菜单（但不清除选择状态，除非明确需要）
    if (contextMenu.visible) {
      setContextMenu(prev => ({ ...prev, visible: false }));
    }
    
    const cellPos = getCellFromPosition(e.clientX, e.clientY);
    if (!cellPos) return;
    
    const { row, col } = cellPos;
    
    if (e.button === 0) { // 左键
      if (isRunning) return;
      
      // 如果有复制的图案或选中的图案，让onClick事件处理
      if (copiedPattern || selectedPattern) {
        return;
      }
      
      // 如果不在复制模式，清除之前的选择
      clearSelection();
      
      if (isDrawing) {
        // 绘图模式：只在真正开始拖拽时才处理
        // 单击操作由onClick事件处理，避免重复调用
        setIsDragging(true);
        
        // 根据当前细胞状态决定绘制模式
        const currentState = mode === 'finite' 
          ? engine.getCellState(row, col)
          : engine.getInfiniteCell(col, row);
        
        setDragMode(currentState ? 'erase' : 'draw');
        // 注意：这里不立即调用handleDragDraw，让onClick处理单击
      }
      // 普通模式的单击切换由onClick事件处理
    } else if (e.button === 2) { // 右键
      if (isDrawing) {
        // 绘图模式下右键：开始选择区域
        if (!isRunning) {
          // 清除之前的选择（右键选择时总是清除）
          clearSelection();
          setIsDragging(false); // 确保不在拖拽状态
          startSelection(row, col);
        }
      }
    }
  }, [isRunning, isDrawing, getCellFromPosition, handleCellClick, handleDragDraw, mode, engine, selectedPattern, onPatternPlace, contextMenu.visible, clearSelection, copiedPattern, pastePattern, startSelection]);

  /**
   * 鼠标移动事件
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const cellPos = getCellFromPosition(e.clientX, e.clientY);
    if (!cellPos) {
      setPreviewCells([]);
      return;
    }
    
    const { row, col } = cellPos;
    
    // 如果正在拖拽绘制（只在绘图模式且不在选择状态下）
    if (isDragging && isDrawing && !isSelecting) {
      handleDragDraw(row, col);
    }
    
    // 如果正在选择区域
    if (isSelecting) {
      updateSelection(row, col);
    }
    
    // 显示图案预览（只在有选中图案且不在运行状态下）
    if (selectedPattern && !isRunning && !isSelecting) {
      const preview = selectedPattern.cells.map(cell => ({
        row: row + cell.y,
        col: col + cell.x
      })).filter(cell => 
        cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols
      );
      setPreviewCells(preview);
    } else if (copiedPattern && !isRunning && !isSelecting) {
       // 显示复制图案的预览
       const preview = copiedPattern.cells.map(cell => ({
         row: row + cell.y,
         col: col + cell.x
       })).filter(cell => 
         cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols
       );
       setPreviewCells(preview);
    } else {
      setPreviewCells([]);
    }
  }, [getCellFromPosition, isDragging, isDrawing, isSelecting, handleDragDraw, updateSelection, selectedPattern, copiedPattern, isRunning, rows, cols]);

  /**
   * 鼠标抬起事件
   */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setLastDrawnCell(null);
      updateStats(); // 更新统计信息
    }
    
    // 如果正在选择区域且是右键抬起
    if (isSelecting && e.button === 2) {
      endSelection();
      // 显示右键菜单
      if (selectionStart && selectionEnd) {
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          visible: true
        });
      }
    }
  }, [isDragging, isSelecting, selectionStart, selectionEnd, updateStats, endSelection]);

  /**
   * 鼠标离开事件
   */
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setLastDrawnCell(null);
    setPreviewCells([]);
  }, []);
  
  // 处理右键菜单操作
  const handleContextMenuAction = useCallback((action: ContextMenuAction) => {
    if (action === 'cancel') {
      // 清除所有相关状态
      useGameStore.setState({ 
        copiedPattern: null,
        selectedPattern: null,
        isSelecting: false,
        selectionStart: null,
        selectionEnd: null
      });
      clearSelection();
      setPreviewCells([]);
      setIsDragging(false);
      setLastDrawnCell(null);
      return;
    }

    if (!selectionStart || !selectionEnd) return;

    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);

    switch (action) {
      case 'copy':
        // 复制操作：复制选区并进入粘贴模式
        copySelection();
        clearSelection();
        break;
      case 'delete':
        // 删除操作：直接删除选区，不进入粘贴模式
        deleteSelection();
        clearSelection();
        break;
      case 'rotate':
        // 旋转操作：就地旋转，不进入粘贴模式
        {
          saveToHistory();
          markUserOperation();
          
          const cells: { x: number; y: number }[] = [];
          for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
              if (engine.getCellState(row, col)) {
                cells.push({ x: col - minCol, y: row - minRow });
              }
            }
          }
          
          // 清除原区域
          for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
              engine.setCellState(row, col, false);
            }
          }
          
          // 旋转并放置
          const width = maxCol - minCol + 1;
          const height = maxRow - minRow + 1;
          cells.forEach(cell => {
            const rotatedX = height - 1 - cell.y;
            const rotatedY = cell.x;
            const targetRow = minRow + rotatedY;
            const targetCol = minCol + rotatedX;
            if (targetRow >= 0 && targetRow < engine.getGridSize().rows && 
                targetCol >= 0 && targetCol < engine.getGridSize().cols) {
              engine.setCellState(targetRow, targetCol, true);
            }
          });
          
          updateStats();
        }
        clearSelection();
        break;
      case 'flipH':
        // 水平翻转操作：就地翻转，不进入粘贴模式
        {
          saveToHistory();
          markUserOperation();
          
          const cells: { x: number; y: number }[] = [];
          for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
              if (engine.getCellState(row, col)) {
                cells.push({ x: col - minCol, y: row - minRow });
              }
            }
          }
          
          // 清除原区域
          for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
              engine.setCellState(row, col, false);
            }
          }
          
          // 水平翻转并放置
          const width = maxCol - minCol + 1;
          cells.forEach(cell => {
            const flippedX = width - 1 - cell.x;
            const targetRow = minRow + cell.y;
            const targetCol = minCol + flippedX;
            if (targetRow >= 0 && targetRow < engine.getGridSize().rows && 
                targetCol >= 0 && targetCol < engine.getGridSize().cols) {
              engine.setCellState(targetRow, targetCol, true);
            }
          });
          
          updateStats();
        }
        clearSelection();
        break;
      case 'flipV':
        // 垂直翻转操作：就地翻转，不进入粘贴模式
        {
          saveToHistory();
          markUserOperation();
          
          const cells: { x: number; y: number }[] = [];
          for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
              if (engine.getCellState(row, col)) {
                cells.push({ x: col - minCol, y: row - minRow });
              }
            }
          }
          
          // 清除原区域
          for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
              engine.setCellState(row, col, false);
            }
          }
          
          // 垂直翻转并放置
          const height = maxRow - minRow + 1;
          cells.forEach(cell => {
            const flippedY = height - 1 - cell.y;
            const targetRow = minRow + flippedY;
            const targetCol = minCol + cell.x;
            if (targetRow >= 0 && targetRow < engine.getGridSize().rows && 
                targetCol >= 0 && targetCol < engine.getGridSize().cols) {
              engine.setCellState(targetRow, targetCol, true);
            }
          });
          
          updateStats();
        }
        clearSelection();
        break;
      case 'pan':
        // 平移操作：复制选区、删除原区域并进入粘贴模式
        copySelection();
        deleteSelection(); // 删除原区域
        clearSelection();
        break;
    }
  }, [copySelection, deleteSelection, clearSelection, rotateSelection, flipSelectionHorizontal, flipSelectionVertical, pastePattern, selectionStart, selectionEnd, engine, saveToHistory, markUserOperation, updateStats]);
  
  // 关闭右键菜单
  const handleContextMenuClose = useCallback(() => {
    setContextMenu({ x: 0, y: 0, visible: false });
  }, []);

  // 触摸事件处理（移动端支持）
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!touchMode) return;
    
    const touch = e.touches[0];
    const mouseEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => e.preventDefault()
    } as React.MouseEvent;
    
    handleMouseDown(mouseEvent);
  }, [touchMode, handleMouseDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchMode) return;
    
    const touch = e.touches[0];
    const mouseEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY
    } as React.MouseEvent;
    
    handleMouseMove(mouseEvent);
    e.preventDefault(); // 防止页面滚动
  }, [touchMode, handleMouseMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchMode) return;
    // 创建模拟的鼠标事件
    const mouseEvent = {
      button: 0,
      clientX: 0,
      clientY: 0
    } as React.MouseEvent;
    handleMouseUp(mouseEvent);
    e.preventDefault();
  }, [touchMode, handleMouseUp]);

  // 拖放事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const patternData = e.dataTransfer.getData('application/json');
      if (patternData) {
        const pattern: Pattern = JSON.parse(patternData);
        const cellPos = getCellFromPosition(e.clientX, e.clientY);
        
        if (cellPos) {
          onPatternPlace?.(pattern, cellPos.row, cellPos.col);
        }
      }
    } catch (error) {
      console.error('Failed to parse dropped pattern:', error);
    }
  }, [getCellFromPosition, onPatternPlace]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框中，不处理快捷键
      if (document.activeElement?.tagName === 'INPUT') return;
      
      switch (e.key) {
        case ' ': // 空格键：播放/暂停
          e.preventDefault();
          const { isRunning, play, pause } = useGameStore.getState();
          if (isRunning) {
            pause();
          } else {
            play();
          }
          break;
          
        // 注意：右箭头快捷键已在GamePage中处理，这里不再重复处理
        // case 'ArrowRight': // 右箭头：单步执行
        //   e.preventDefault();
        //   useGameStore.getState().step();
        //   break;
          
        case 'c': // C键：清空
          e.preventDefault();
          useGameStore.getState().reset();
          break;
          
        case 'r': // R键：随机化
          e.preventDefault();
          useGameStore.getState().randomize();
          break;
          
        case 'd': // D键：切换绘图模式
          e.preventDefault();
          useGameStore.getState().toggleDrawing();
          break;
          
        case 'Escape': // ESC键：清除选择和复制状态
          e.preventDefault();
          const state = useGameStore.getState();
          // 清除所有相关状态
          useGameStore.setState({ 
            copiedPattern: null,
            selectedPattern: null,
            isSelecting: false,
            selectionStart: null,
            selectionEnd: null
          });
          state.clearSelection();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 渲染单个细胞
  const renderCell = (row: number, col: number) => {
    let isAlive = false;
    
    if (mode === 'finite' && gridData) {
      isAlive = gridData[row][col];
    } else if (mode === 'infinite' && infiniteCells) {
      isAlive = infiniteCells.has(`${col},${row}`);
    }
    
    // 检查是否为预览细胞
    const isPreview = previewCells.some(cell => cell.row === row && cell.col === col);
    
    // 检查是否在选择区域内
    const isInSelection = selectionStart && selectionEnd && 
      row >= Math.min(selectionStart.row, selectionEnd.row) &&
      row <= Math.max(selectionStart.row, selectionEnd.row) &&
      col >= Math.min(selectionStart.col, selectionEnd.col) &&
      col <= Math.max(selectionStart.col, selectionEnd.col);
    
    return (
      <div
        key={`${row}-${col}`}
        className={cn(
          'transition-all duration-200 ease-in-out rounded-sm cursor-pointer',
          'hover:scale-110 hover:z-10 relative',
          {
            // 死细胞：半透明白色背景
            'bg-white/10 hover:bg-white/20': !isAlive && !isInSelection && !isPreview,
            // 普通活细胞：红色背景
            'bg-red-500 shadow-lg shadow-red-500/30': isAlive && !isInSelection && !isPreview,
            // 预览状态：绿色背景
            'bg-green-500/60 border-2 border-green-400': isPreview,
            // 选择状态：蓝色虚线边框
            'border-2 border-dashed border-blue-400': isInSelection && !isAlive,
            // 选择区域内的死细胞：蓝色半透明背景
            'bg-blue-500/20 border-2 border-dashed border-blue-400': isInSelection && !isAlive,
            // 选择区域内的活细胞：绿色背景（优先级最高）
            'bg-green-500 shadow-lg shadow-green-500/30 border-2 border-dashed border-blue-400': isInSelection && isAlive,
            // 移动端：增大点击区域
            'min-h-[16px] min-w-[16px]': isMobile
          }
        )}
        style={{
          width: cellSize,
          height: cellSize
        }}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => e.preventDefault()} // 禁用右键菜单
        onClick={(e) => {
           // 阻止事件冒泡，避免触发网格的点击事件
           e.stopPropagation();
           
           // 如果游戏正在运行，不处理任何点击
           if (isRunning) return;
           
           // 如果正在选择区域，不处理点击
           if (isSelecting) return;
           
           // 如果正在拖拽，不处理点击（避免重复操作）
           if (isDragging) return;
           
           // 粘贴模式：处理图案粘贴
           if (copiedPattern) {
             pastePattern(row, col);
             return;
           }
           
           // 如果有选中的图案，放置图案
           if (selectedPattern) {
             onPatternPlace?.(selectedPattern, row, col);
             return;
           }
           
           // 绘图模式下的单击：直接切换细胞状态（优化快速点击响应）
           if (isDrawing) {
             // 在绘图模式下，单击直接切换细胞状态，不需要拖拽逻辑
             if (mode === 'finite') {
               const currentState = engine.getCellState(row, col);
               setCellState(row, col, !currentState);
             } else {
               const currentState = engine.getInfiniteCell(col, row);
               setInfiniteCell(col, row, !currentState);
             }
             updateStats(); // 更新统计信息
           } else {
             // 普通模式：使用handleCellClick处理（包含历史记录）
             handleCellClick(row, col);
           }
         }}
        onMouseEnter={(e) => {
          if (isDragging) {
            const cellPos = getCellFromPosition(e.clientX, e.clientY);
            if (cellPos) {
              handleDragDraw(cellPos.row, cellPos.col);
            }
          }
        }}
        onTouchStart={handleTouchStart}
      />
    );
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        'flex justify-center items-center p-4',
        'select-none', // 防止文本选择
        className
      )}
    >
      <div
        ref={gridRef}
        className={cn(
          'inline-grid gap-px rounded-lg overflow-hidden',
          'bg-black/30 border-2 transition-colors duration-300',
          {
            // 不同模式的边框颜色
            'border-blue-400': !isRunning && !isDrawing,
            'border-yellow-400': isDrawing && !isRunning,
            'border-red-400': isRunning,
            // 移动端优化
            'touch-none': touchMode, // 禁用触摸滚动
          }
        )}
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onContextMenu={(e) => e.preventDefault()} // 禁用右键菜单
        onClick={(e) => {
          // 点击网格空白区域时清除复制状态
          if (copiedPattern && e.target === e.currentTarget) {
            useGameStore.setState({ copiedPattern: null });
          }
        }}
      >
        {/* 渲染所有细胞 */}
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) => renderCell(row, col))
        )}
      </div>
      
      {/* 状态指示器 */}
      <div className="absolute top-2 left-2 flex gap-2">
        {isRunning && (
          <div className="px-2 py-1 bg-red-500/80 text-white text-xs rounded-full animate-pulse">
            运行中
          </div>
        )}
        {isDrawing && !isRunning && (
          <div className="px-2 py-1 bg-yellow-500/80 text-white text-xs rounded-full">
            绘图模式
          </div>
        )}
        {selectedPattern && (
          <div className="px-2 py-1 bg-green-500/80 text-white text-xs rounded-full">
            {selectedPattern.name}
          </div>
        )}

      </div>
      
      {/* 右键上下文菜单 */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        onAction={handleContextMenuAction}
        onClose={handleContextMenuClose}
      />
    </div>
  );
}

export default GameGrid;