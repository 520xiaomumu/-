// 无限画布组件 - 实现真正的无限宇宙功能
// 基于生命游戏6.html的实现，提供Canvas渲染、视口系统、坐标转换等核心功能

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore } from '../lib/store';
import { Pattern } from '../lib/gameEngine';
import { cn } from '../lib/utils';
import ContextMenu, { ContextMenuAction } from './ContextMenu';

// 视口状态接口 - 管理无限画布的视图
interface Viewport {
  scale: number;        // 缩放比例
  offsetX: number;      // X轴偏移
  offsetY: number;      // Y轴偏移
  isDragging: boolean;  // 是否正在拖拽
  lastMousePos: { x: number; y: number }; // 上次鼠标位置
  mouseDownPos?: { x: number; y: number }; // 鼠标按下位置
  hasMoved: boolean;    // 是否已移动
}

// 组件属性接口
interface InfiniteCanvasProps {
  className?: string;
  onCellClick?: (x: number, y: number) => void;
  onPatternPlace?: (pattern: Pattern, x: number, y: number) => void;
}

/**
 * 无限画布组件
 * 提供真正的无限宇宙功能，支持缩放、平移、绘制等操作
 */
export function InfiniteCanvas({
  className,
  onCellClick,
  onPatternPlace
}: InfiniteCanvasProps) {
  // 获取游戏状态
  const {
    engine,
    mode,
    isRunning,
    isDrawing,
    selectedPattern,
    isSelecting,
    selectionStart,
    selectionEnd,
    copiedPattern,
    setInfiniteCell,
    updateStats,
    setSelectedPattern,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    pastePattern,
    saveToHistory,
    markUserOperation,
    setCopiedPattern
  } = useGameStore();

  // Canvas引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 本地状态
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [mouseWorldPos, setMouseWorldPos] = useState<{ x: number; y: number } | null>(null); // 鼠标在世界坐标系中的位置
  const [isMouseDown, setIsMouseDown] = useState(false); // 鼠标是否按下
  const [dragMode, setDragMode] = useState<'draw' | 'erase'>('draw'); // 拖拽绘制模式
  const [lastDrawnCell, setLastDrawnCell] = useState<{ x: number; y: number } | null>(null); // 上次绘制的细胞
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false }); // 右键菜单状态

  /**
   * 屏幕坐标转世界坐标
   * 将鼠标点击位置转换为游戏世界中的细胞坐标
   */
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    const currentViewport = engine.getViewport();
    const scale = currentViewport.cellSize * currentViewport.zoom;
    
    const worldX = Math.floor((canvasX - currentViewport.x) / scale);
    const worldY = Math.floor((canvasY - currentViewport.y) / scale);
    
    return { x: worldX, y: worldY };
  }, [engine]);

  /**
   * 绘制无限画布
   * 渲染网格线、活细胞等内容
   */
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || mode !== 'infinite') return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const currentViewport = engine.getViewport();
    
    // 动态调整画布大小 - 确保画布填满容器
    if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    
    // 清空画布并设置背景色
    ctx.fillStyle = '#1a1a1a'; // 深灰色背景
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const cellSize = currentViewport.cellSize * currentViewport.zoom;
    
    // 绘制网格线（在合适的缩放级别下）
    if (currentViewport.zoom > 0.3) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      
      // 计算网格起始位置
      const offsetX = currentViewport.x % cellSize;
      const offsetY = currentViewport.y % cellSize;
      
      // 绘制垂直线
      for (let x = offsetX; x < canvas.width; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(Math.floor(x) + 0.5, 0);
        ctx.lineTo(Math.floor(x) + 0.5, canvas.height);
        ctx.stroke();
      }
      
      // 绘制水平线
      for (let y = offsetY; y < canvas.height; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, Math.floor(y) + 0.5);
        ctx.lineTo(canvas.width, Math.floor(y) + 0.5);
        ctx.stroke();
      }
    }
    
    // 绘制活细胞
    ctx.fillStyle = '#ef4444'; // 红色活细胞，与有限模式保持一致
    const infiniteCells = engine.getInfiniteCells();
    
    // 遍历所有活细胞并绘制在可见区域内的
    for (const [key] of infiniteCells) {
      const [x, y] = key.split(',').map(Number);
      const screenPos = engine.worldToScreen(x, y);
      
      // 只绘制在画布范围内的细胞
      if (screenPos.x >= -cellSize && screenPos.x < canvas.width &&
          screenPos.y >= -cellSize && screenPos.y < canvas.height) {
        const size = Math.max(2, cellSize - 2); // 确保细胞可见
        ctx.fillRect(
          Math.floor(screenPos.x + 1),
          Math.floor(screenPos.y + 1),
          size,
          size
        );
      }
    }
    
    // 绘制选中图案的预览（跟随鼠标）
    if (selectedPattern && mouseWorldPos) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'; // 绿色半透明预览
      
      selectedPattern.cells.forEach(cell => {
        const previewX = mouseWorldPos.x + cell.x - Math.floor(selectedPattern.width / 2);
        const previewY = mouseWorldPos.y + cell.y - Math.floor(selectedPattern.height / 2);
        const screenPos = engine.worldToScreen(previewX, previewY);
        
        // 只绘制在画布范围内的预览细胞
        if (screenPos.x >= -cellSize && screenPos.x < canvas.width &&
            screenPos.y >= -cellSize && screenPos.y < canvas.height) {
          const size = Math.max(2, cellSize - 2);
          ctx.fillRect(
            Math.floor(screenPos.x + 1),
            Math.floor(screenPos.y + 1),
            size,
            size
          );
        }
      });
    }
    
    // 绘制复制图案的预览（跟随鼠标）
    if (copiedPattern && mouseWorldPos && !selectedPattern) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'; // 绿色半透明预览
      
      copiedPattern.cells.forEach(cell => {
        const previewX = mouseWorldPos.x + cell.x;
        const previewY = mouseWorldPos.y + cell.y;
        const screenPos = engine.worldToScreen(previewX, previewY);
        
        // 只绘制在画布范围内的预览细胞
        if (screenPos.x >= -cellSize && screenPos.x < canvas.width &&
            screenPos.y >= -cellSize && screenPos.y < canvas.height) {
          const size = Math.max(2, cellSize - 2);
          ctx.fillRect(
            Math.floor(screenPos.x + 1),
            Math.floor(screenPos.y + 1),
            size,
            size
          );
        }
      });
    }
    
    // 绘制选择框（绘图模式下的右键选择）
    if (isSelecting && selectionStart && selectionEnd) {
      const startScreen = engine.worldToScreen(selectionStart.col, selectionStart.row);
      const endScreen = engine.worldToScreen(selectionEnd.col, selectionEnd.row);
      
      const minX = Math.min(startScreen.x, endScreen.x);
      const minY = Math.min(startScreen.y, endScreen.y);
      const maxX = Math.max(startScreen.x, endScreen.x) + cellSize;
      const maxY = Math.max(startScreen.y, endScreen.y) + cellSize;
      
      // 绘制选择框边框
      ctx.strokeStyle = '#3b82f6'; // 蓝色边框
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // 虚线
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      
      // 绘制选择框背景
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // 蓝色半透明背景
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      
      ctx.setLineDash([]); // 重置虚线
    }
    
    ctx.restore();
  }, [engine, mode, selectedPattern, mouseWorldPos, isDrawing, isSelecting, selectionStart, selectionEnd]);

  // 处理图案放置 - 优化无限模式下的图案放置
  const handlePatternPlace = useCallback((pattern: Pattern, x: number, y: number) => {
    // 保存当前状态到历史记录
    const { saveToHistory, markUserOperation } = useGameStore.getState();
    saveToHistory();
    markUserOperation();
    
    if (engine.getMode() === 'infinite') {
      // 无限模式下放置图案 - 确保坐标转换正确
      pattern.cells.forEach(cell => {
        const cellX = x + cell.x - Math.floor(pattern.width / 2);
        const cellY = y + cell.y - Math.floor(pattern.height / 2);
        setInfiniteCell(cellX, cellY, true);
      });
    } else {
      // 有限模式下放置图案
      onPatternPlace?.(pattern, x, y);
    }
    updateStats();
  }, [engine, setInfiniteCell, onPatternPlace, updateStats]);

  /**
   * 处理拖拽绘制 - 避免重复绘制同一个细胞
   */
  const handleDragDraw = useCallback((x: number, y: number) => {
    // 避免重复绘制同一个细胞
    if (lastDrawnCell && lastDrawnCell.x === x && lastDrawnCell.y === y) {
      return;
    }
    
    const currentState = engine.getInfiniteCell(x, y);
    const newState = dragMode === 'draw' ? true : false;
    
    if (currentState !== newState) {
      setInfiniteCell(x, y, newState);
    }
    
    setLastDrawnCell({ x, y });
  }, [lastDrawnCell, dragMode, engine, setInfiniteCell]);

  /**
   * 处理鼠标按下事件
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    // 清除之前的菜单
    if (contextMenu.visible) {
      setContextMenu(prev => ({ ...prev, visible: false }));
    }
    
    if (e.button === 0) { // 左键
      if (isRunning) return;
      
      if (selectedPattern && !isDrawing) {
        // 放置图案 - 只有在非绘图模式下才能放置图案
        handlePatternPlace(selectedPattern, worldPos.x, worldPos.y);
        // 注意：不自动清除selectedPattern，保持选择状态
        return;
      }
      
      // 如果有复制的图案且是左键点击，处理粘贴
      if (copiedPattern && !selectedPattern) {
        // 无限模式下的粘贴逻辑
        saveToHistory();
        markUserOperation();
        
        copiedPattern.cells.forEach(cell => {
          const targetX = worldPos.x + cell.x;
          const targetY = worldPos.y + cell.y;
          setInfiniteCell(targetX, targetY, true);
        });
        
        updateStats();
        return;
      }
      
      // 清除选择状态
      clearSelection();
      
      if (isDrawing) {
        // 绘图模式：开始拖拽绘制
        setIsMouseDown(true);
        setIsDragging(true);
        
        // 根据当前细胞状态决定绘制模式
        const currentState = engine.getInfiniteCell(worldPos.x, worldPos.y);
        setDragMode(currentState ? 'erase' : 'draw');
        
        // 立即绘制第一个细胞
        setInfiniteCell(worldPos.x, worldPos.y, !currentState);
        setLastDrawnCell({ x: worldPos.x, y: worldPos.y });
        onCellClick?.(worldPos.x, worldPos.y);
        updateStats();
      } else {
        // 非绘图模式下的普通点击
        const currentState = engine.getInfiniteCell(worldPos.x, worldPos.y);
        setInfiniteCell(worldPos.x, worldPos.y, !currentState);
        onCellClick?.(worldPos.x, worldPos.y);
        updateStats();
      }
    } else if (e.button === 2) { // 右键
      if (isDrawing) {
        // 绘图模式下右键：开始选择区域
        if (!isRunning) {
          clearSelection();
          setIsDragging(false); // 确保不在拖拽状态
          startSelection(worldPos.y, worldPos.x);
        }
      } else {
        // 非绘图模式下右键用于拖拽视图
        setIsDragging(true);
        setLastMousePos({ x, y });
      }
    }
  }, [isRunning, isDrawing, screenToWorld, onCellClick, handlePatternPlace, selectedPattern, engine, setInfiniteCell, updateStats, contextMenu.visible, copiedPattern, pastePattern, clearSelection, startSelection]);

  /**
   * 处理鼠标移动事件
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // 更新鼠标在世界坐标系中的位置（用于图案预览）
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setMouseWorldPos(worldPos);
    
    // 如果正在拖拽绘制（只在绘图模式且不在选择状态下）
    if (isDragging && isDrawing && isMouseDown && !isSelecting) {
      handleDragDraw(worldPos.x, worldPos.y);
      updateStats();
    }
    // 如果正在选择区域
    else if (isSelecting && selectionStart) {
      updateSelection(worldPos.y, worldPos.x);
    }
    // 如果正在拖拽视图（非绘图模式）
    else if (isDragging && lastMousePos && !isDrawing) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const deltaX = x - lastMousePos.x;
      const deltaY = y - lastMousePos.y;
      
      // 更新视口位置
      const currentViewport = engine.getViewport();
      engine.setViewportPosition(
        currentViewport.x + deltaX,
        currentViewport.y + deltaY
      );
      
      setLastMousePos({ x, y });
    }
    
    // 重新绘制画布（包括图案预览和选择框）
    // 确保在鼠标移动时立即更新预览
    requestAnimationFrame(() => {
      drawCanvas();
    });
  }, [isDragging, lastMousePos, engine, drawCanvas, isDrawing, screenToWorld, isMouseDown, isSelecting, selectionStart, handleDragDraw, updateStats, updateSelection]);

  /**
   * 处理鼠标释放事件
   */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    if (e.button === 0) { // 左键释放
      setIsMouseDown(false);
      setIsDragging(false);
      setLastDrawnCell(null);
      if (isDragging && isDrawing) {
        updateStats(); // 更新统计信息
      }
    } else if (e.button === 2) { // 右键释放
      setIsDragging(false);
      
      // 如果在绘图模式下且正在选择区域，结束选择并显示菜单
      if (isDrawing && isSelecting) {
        endSelection();
        
        // 检查是否有有效的选择区域
        if (selectionStart && selectionEnd) {
          const minRow = Math.min(selectionStart.row, selectionEnd.row);
          const maxRow = Math.max(selectionStart.row, selectionEnd.row);
          const minCol = Math.min(selectionStart.col, selectionEnd.col);
          const maxCol = Math.max(selectionStart.col, selectionEnd.col);
          
          // 检查选择区域内是否有细胞
          let hasCells = false;
          for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
              if (engine.getInfiniteCell(col, row)) {
                hasCells = true;
                break;
              }
            }
            if (hasCells) break;
          }
          
          // 只有当选择区域内有细胞时才显示菜单
          if (hasCells) {
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              visible: true
            });
          }
        }
      }
    }
  }, [isDragging, isDrawing, isSelecting, updateStats, selectionStart, selectionEnd, endSelection, engine, screenToWorld]);

  /**
   * 处理鼠标离开事件
   */
  const handleMouseLeave = useCallback(() => {
    // 清除鼠标位置，隐藏图案预览
    setMouseWorldPos(null);
    setIsDragging(false);
    setIsMouseDown(false);
    setLastDrawnCell(null);
    drawCanvas();
  }, [drawCanvas]);

  /**
   * 处理右键菜单操作
   */
  const handleContextMenuAction = useCallback((action: ContextMenuAction) => {
    if (!selectionStart || !selectionEnd) return;
    
    const minX = Math.min(selectionStart.row, selectionEnd.row);
    const maxX = Math.max(selectionStart.row, selectionEnd.row);
    const minY = Math.min(selectionStart.col, selectionEnd.col);
    const maxY = Math.max(selectionStart.col, selectionEnd.col);
    
    // 保存历史记录
    saveToHistory();
    markUserOperation();
    
    switch (action) {
      case 'copy':
        // 无限模式的复制功能
        {
          const cells: { x: number; y: number }[] = [];
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              if (engine.getInfiniteCell(col, row)) {
                cells.push({ x: col - minY, y: row - minX });
              }
            }
          }
          
          setCopiedPattern({
            cells,
            width: maxY - minY + 1,
            height: maxX - minX + 1
          });
        }
        break;
        
      case 'pan':
        // 移动操作：先复制再删除
        {
          const cells: { x: number; y: number }[] = [];
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              if (engine.getInfiniteCell(col, row)) {
                cells.push({ x: col - minY, y: row - minX });
              }
            }
          }
          
          setCopiedPattern({
            cells,
            width: maxY - minY + 1,
            height: maxX - minX + 1
          });
          
          // 删除原区域
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              setInfiniteCell(col, row, false);
            }
          }
        }
        break;
        
      case 'rotate':
        // 旋转操作
        {
          const cells: Array<{ x: number; y: number }> = [];
          
          // 收集选择区域内的细胞
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              if (engine.getInfiniteCell(col, row)) {
                cells.push({ x: col, y: row });
              }
            }
          }
          
          // 清除原区域
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              setInfiniteCell(col, row, false);
            }
          }
          
          // 计算旋转中心
          const centerX = (minY + maxY) / 2;
          const centerY = (minX + maxX) / 2;
          
          // 旋转并重新放置细胞
          cells.forEach(({ x, y }) => {
            const relX = x - centerX;
            const relY = y - centerY;
            const newX = Math.round(centerX - relY);
            const newY = Math.round(centerY + relX);
            setInfiniteCell(newX, newY, true);
          });
        }
        break;
        
      case 'flipH':
        // 水平翻转
        {
          const cells: Array<{ x: number; y: number }> = [];
          
          // 收集选择区域内的细胞
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              if (engine.getInfiniteCell(col, row)) {
                cells.push({ x: col, y: row });
              }
            }
          }
          
          // 清除原区域
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              setInfiniteCell(col, row, false);
            }
          }
          
          // 水平翻转并重新放置细胞
          cells.forEach(({ x, y }) => {
            const newX = maxY - (x - minY);
            setInfiniteCell(newX, y, true);
          });
        }
        break;
        
      case 'flipV':
        // 垂直翻转
        {
          const cells: Array<{ x: number; y: number }> = [];
          
          // 收集选择区域内的细胞
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              if (engine.getInfiniteCell(col, row)) {
                cells.push({ x: col, y: row });
              }
            }
          }
          
          // 清除原区域
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              setInfiniteCell(col, row, false);
            }
          }
          
          // 垂直翻转并重新放置细胞
          cells.forEach(({ x, y }) => {
            const newY = maxX - (y - minX);
            setInfiniteCell(x, newY, true);
          });
        }
        break;
        
      case 'delete':
        // 无限模式的删除功能
        {
          for (let row = minX; row <= maxX; row++) {
            for (let col = minY; col <= maxY; col++) {
              setInfiniteCell(col, row, false);
            }
          }
        }
        break;
        
      case 'cancel':
        // 取消操作，只清除选择
        break;
    }
    
    // 关闭菜单并清除选择
    setContextMenu(prev => ({ ...prev, visible: false }));
    clearSelection();
    updateStats();
  }, [selectionStart, selectionEnd, engine, setInfiniteCell, saveToHistory, markUserOperation, setCopiedPattern, clearSelection, updateStats]);

  /**
   * 处理滚轮事件（缩放）
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const currentViewport = engine.getViewport();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, currentViewport.zoom * zoomFactor));
    
    // 计算缩放中心
    const zoomCenterX = (mouseX - currentViewport.x) / currentViewport.zoom;
    const zoomCenterY = (mouseY - currentViewport.y) / currentViewport.zoom;
    
    // 更新视口位置以保持鼠标位置不变
    const newX = mouseX - zoomCenterX * newZoom;
    const newY = mouseY - zoomCenterY * newZoom;
    
    engine.setViewportZoom(newZoom);
    engine.setViewportPosition(newX, newY);
    
    drawCanvas();
  }, [engine, drawCanvas]);

  // 初始化无限画布 - 只在首次加载时设置，不重置视口
  useEffect(() => {
    if (mode === 'infinite') {
      const canvas = canvasRef.current;
      if (canvas) {
        // 确保画布尺寸正确
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // 只在首次初始化时设置视口（检查是否已有视口设置）
        const currentViewport = engine.getViewport();
        if (currentViewport.zoom === 1 && currentViewport.x === 0 && currentViewport.y === 0) {
          // 首次初始化：设置到中心位置
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          engine.setViewportPosition(centerX, centerY);
        }
        
        // 添加一些初始细胞用于测试显示（如果没有细胞的话）
        if (engine.getInfiniteCells().size === 0) {
          // 创建一个简单的滑翔机图案
          engine.setInfiniteCell(0, 0, true);
          engine.setInfiniteCell(1, 0, true);
          engine.setInfiniteCell(2, 0, true);
          engine.setInfiniteCell(2, 1, true);
          engine.setInfiniteCell(1, 2, true);
        }
        
        // 延迟绘制，确保DOM更新完成
        setTimeout(() => {
          drawCanvas();
        }, 100);
      }
    }
  }, [mode, engine, drawCanvas]);
  
  // 监听视口变化，重新绘制画布
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);
  
  // 定期重绘（用于动画）
  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'infinite') {
        drawCanvas();
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [drawCanvas, mode]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (mode === 'infinite') {
        drawCanvas();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas, mode]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        'w-full h-full relative overflow-hidden',
        'bg-gray-900 rounded-lg border-2 transition-colors duration-300',
        {
          'border-blue-400': !isRunning && !isDrawing,
          'border-yellow-400': isDrawing && !isRunning,
          'border-red-400': isRunning,
        },
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          cursor: isDragging ? 'grabbing' : 
                 isDrawing ? 'crosshair' : 
                 selectedPattern ? 'crosshair' : 'grab'
        }}
      />
      
      {/* 状态指示器 */}
      <div className="absolute top-2 left-2 flex gap-2">
        {isRunning && (
          <div className="px-2 py-1 bg-red-500/80 text-white text-xs rounded-full animate-pulse">
            运行中
          </div>
        )}
        {isDrawing && !isRunning && (
          <div className="px-2 py-1 bg-purple-500/80 text-white text-xs rounded-full">
            绘图模式
          </div>
        )}
        {selectedPattern && (
          <div className="px-2 py-1 bg-green-500/80 text-white text-xs rounded-full">
            {selectedPattern.name}
          </div>
        )}
      </div>
      
      {/* 缩放指示器 */}
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
        缩放: {Math.round(engine.getViewport().zoom * 100)}%
      </div>
      
      {/* 操作提示 */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm max-w-xs">
        <div className="space-y-1">
          <div>• 滚轮：缩放</div>
          {!isDrawing && <div>• 右键拖拽：平移视图</div>}
          {isDrawing ? (
            <>
              <div>• 左键拖拽：连续绘制/擦除</div>
              <div>• 右键拖拽：选择区域</div>
            </>
          ) : (
            <div>• 左键：放置图案/切换细胞</div>
          )}
          {selectedPattern && (
            <div className="text-green-300">• 图案预览：{selectedPattern.name}</div>
          )}
          {isSelecting && (
            <div className="text-blue-300">• 正在选择区域</div>
          )}
          <div>• 当前缩放：{Math.round(engine.getViewport().zoom * 100)}%</div>
          <div>• 视口位置：({Math.round(engine.getViewport().x)}, {Math.round(engine.getViewport().y)})</div>
        </div>
      </div>
      
      {/* 右键菜单 */}
       <ContextMenu
         visible={contextMenu.visible}
         x={contextMenu.x}
         y={contextMenu.y}
         onAction={handleContextMenuAction}
         onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
       />
    </div>
  );
}

export default InfiniteCanvas;