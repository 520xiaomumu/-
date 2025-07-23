// 图案库组件 - 提供经典生命游戏图案的浏览、选择和管理
// 包括图案分类、搜索、预览、旋转等功能

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Download, 
  Upload,
  Star,
  Grid,
  Zap,
  Rocket,
  Target,
  Infinity,
  Sparkles,
  X,
  RotateCcw
} from 'lucide-react';
import { useGameStore } from '../lib/store';
import { Pattern } from '../lib/gameEngine';
import { patterns as ALL_PATTERNS, getPatternsByCategory, searchPatterns, rotatePattern, flipPatternHorizontal, flipPatternVertical, PATTERN_CATEGORIES, CATEGORY_NAMES, PatternCategory } from '../lib/patterns';
import { cn } from '../lib/utils';

/**
 * 图案库组件属性
 */
interface PatternLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 图案库组件
 * 提供生命游戏图案的浏览、选择和管理功能
 */
export function PatternLibrary({ isOpen, onClose }: PatternLibraryProps) {
  // 获取游戏状态和操作函数
  const { selectedPattern, setSelectedPattern } = useGameStore();

  // 本地状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PatternCategory | 'all'>('all');
  const [previewPattern, setPreviewPattern] = useState<Pattern | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // 分类信息 - 使用原HTML文件的分类逻辑
  const categories: Array<{ id: PatternCategory | 'all'; name: string; icon: any; description: string }> = [
    { id: 'all' as const, name: '全部', icon: Grid, description: '所有图案' },
    { id: PATTERN_CATEGORIES.SPACESHIP, name: CATEGORY_NAMES[PATTERN_CATEGORIES.SPACESHIP], icon: Rocket, description: '会移动的图案' },
    { id: PATTERN_CATEGORIES.OSCILLATOR, name: CATEGORY_NAMES[PATTERN_CATEGORIES.OSCILLATOR], icon: Zap, description: '周期性变化的图案' },
    { id: PATTERN_CATEGORIES.STATIC, name: CATEGORY_NAMES[PATTERN_CATEGORIES.STATIC], icon: Target, description: '不会改变的稳定图案' },
    { id: PATTERN_CATEGORIES.COMPLEX, name: CATEGORY_NAMES[PATTERN_CATEGORIES.COMPLEX], icon: Sparkles, description: '会产生有趣演化的图案' },
    { id: PATTERN_CATEGORIES.GUN, name: '发射器', icon: Star, description: '会产生其他图案的复杂结构' }
  ];

  // 过滤图案 - 确保分类切换时正确过滤
  const filteredPatterns = useMemo(() => {
    // 首先按分类过滤
    let result = selectedCategory === 'all' ? ALL_PATTERNS : getPatternsByCategory(selectedCategory);
    
    // 然后按搜索词过滤（如果有搜索词）
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(pattern => 
        pattern.name.toLowerCase().includes(searchLower) ||
        pattern.description.toLowerCase().includes(searchLower) ||
        CATEGORY_NAMES[pattern.category as PatternCategory]?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [selectedCategory, searchTerm]);

  // 获取每个分类的图案数量（不受搜索影响）
  const getCategoryCount = (categoryId: PatternCategory | 'all') => {
    if (categoryId === 'all') {
      return ALL_PATTERNS.length;
    }
    return getPatternsByCategory(categoryId).length;
  };

  /**
   * 处理图案选择
   */
  const handlePatternSelect = (pattern: Pattern) => {
    setSelectedPattern(pattern);
    setPreviewPattern(null);
  };

  /**
   * 处理图案预览
   */
  const handlePatternPreview = (pattern: Pattern) => {
    setPreviewPattern(pattern);
  };

  /**
   * 处理收藏切换
   */
  const handleFavoriteToggle = (patternId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(patternId)) {
      newFavorites.delete(patternId);
    } else {
      newFavorites.add(patternId);
    }
    setFavorites(newFavorites);
  };

  // 存储每个图案的变换状态 - 让小朋友能看到图案实时变化
  const [patternTransforms, setPatternTransforms] = useState<Record<string, Pattern>>({});

  /**
   * 处理图案变换 - 支持旋转和翻转，实时预览效果
   */
  const handlePatternTransform = (pattern: Pattern, transform: 'rotate' | 'rotateBack' | 'flipH' | 'flipV') => {
    // 获取当前图案的变换版本，如果没有就用原始图案
    const currentPattern = patternTransforms[pattern.id] || pattern;
    let transformedPattern: Pattern;
    
    switch (transform) {
      case 'rotate':
        // 顺时针旋转90度
        transformedPattern = rotatePattern(currentPattern);
        break;
      case 'rotateBack':
        // 逆时针旋转（旋转3次相当于逆时针旋转1次）
        transformedPattern = rotatePattern(rotatePattern(rotatePattern(currentPattern)));
        break;
      case 'flipH':
        // 水平翻转
        transformedPattern = flipPatternHorizontal(currentPattern);
        break;
      case 'flipV':
        // 垂直翻转
        transformedPattern = flipPatternVertical(currentPattern);
        break;
      default:
        return;
    }
    
    // 保存变换后的图案状态，让图案库中的预览实时更新
    setPatternTransforms(prev => ({
      ...prev,
      [pattern.id]: transformedPattern
    }));
    
    // 如果这个图案正在被预览或选中，也要更新对应的状态
    if (previewPattern?.id === pattern.id) {
      setPreviewPattern(transformedPattern);
    }
    if (selectedPattern?.id === pattern.id) {
      setSelectedPattern(transformedPattern);
    }
  };

  /**
   * 渲染图案预览网格 - 优化大图案的显示比例
   */
  const renderPatternPreview = (pattern: Pattern, maxSize: number = 120) => {
    // 计算图案边界
    const minX = Math.min(...pattern.cells.map(cell => cell.x));
    const maxX = Math.max(...pattern.cells.map(cell => cell.x));
    const minY = Math.min(...pattern.cells.map(cell => cell.y));
    const maxY = Math.max(...pattern.cells.map(cell => cell.y));
    
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    
    // 根据图案大小自动调整单元格尺寸，确保整体不超过maxSize
    const maxDimension = Math.max(width, height);
    let cellSize = 6; // 默认单元格大小
    
    if (maxDimension > 20) {
      // 超大图案（如穿梭机、包围等）
      cellSize = Math.max(2, Math.floor(maxSize / maxDimension));
    } else if (maxDimension > 15) {
      // 大图案
      cellSize = Math.max(3, Math.floor(maxSize / maxDimension));
    } else if (maxDimension > 10) {
      // 中等图案
      cellSize = 4;
    } else {
      // 小图案
      cellSize = 6;
    }
    
    // 创建网格
    const grid = Array(height).fill(null).map(() => Array(width).fill(false));
    
    // 填充细胞
    pattern.cells.forEach(cell => {
      const x = cell.x - minX;
      const y = cell.y - minY;
      if (x >= 0 && x < width && y >= 0 && y < height) {
        grid[y][x] = true;
      }
    });
    
    return (
      <div 
        className="inline-grid gap-px bg-black/20 rounded border"
        style={{
          gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${height}, ${cellSize}px)`
        }}
      >
        {grid.flat().map((isAlive, index) => (
          <div
            key={index}
            className={cn(
              'rounded-sm transition-colors',
              {
                'bg-red-400': isAlive,
                'bg-white/10': !isAlive
              }
            )}
            style={{ width: cellSize, height: cellSize }}
          />
        ))}
      </div>
    );
  };

  /**
   * 渲染图案卡片
   */
  // 拖拽开始处理
  const handleDragStart = (e: React.DragEvent, pattern: Pattern) => {
    // 获取当前图案的变换版本
    const displayPattern = patternTransforms[pattern.id] || pattern;
    e.dataTransfer.setData('application/json', JSON.stringify(displayPattern));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const renderPatternCard = (pattern: Pattern) => {
    const isSelected = selectedPattern?.id === pattern.id;
    const isFavorite = favorites.has(pattern.id);
    const isPreview = previewPattern?.id === pattern.id;
    
    // 获取当前图案的变换版本用于显示 - 让小朋友看到实时变化
    const displayPattern = patternTransforms[pattern.id] || pattern;
    
    return (
      <div
        key={pattern.id}
        draggable
        onDragStart={(e) => handleDragStart(e, displayPattern)}
        className={cn(
          'bg-white/5 rounded-lg p-3 border transition-all duration-200 cursor-pointer',
          'hover:bg-white/10 hover:scale-105 hover:shadow-lg',
          {
            'border-blue-400 bg-blue-500/20': isSelected,
            'border-green-400 bg-green-500/20': isPreview && !isSelected,
            'border-white/20': !isSelected && !isPreview
          }
        )}
        onClick={() => handlePatternSelect(displayPattern)}
        onMouseEnter={() => handlePatternPreview(displayPattern)}
        onMouseLeave={() => setPreviewPattern(null)}
      >
        {/* 图案预览 - 显示变换后的效果 */}
        <div className="flex justify-center mb-2 min-h-[80px] items-center">
          {renderPatternPreview(displayPattern, 100)}
        </div>
        
        {/* 图案信息 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white truncate">
              {pattern.name}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFavoriteToggle(pattern.id);
              }}
              className={cn(
                'p-1 rounded transition-colors',
                {
                  'text-yellow-400 hover:text-yellow-300': isFavorite,
                  'text-white/40 hover:text-white/60': !isFavorite
                }
              )}
            >
              <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          
          <p className="text-xs text-white/60 line-clamp-2">
            {pattern.description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>{pattern.cells.length} 细胞</span>
            <span className="capitalize">{pattern.category}</span>
          </div>
        </div>
        
        {/* 操作按钮 - 只保留旋转和翻转 */}
        {(isSelected || isPreview) && (
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
            {/* 旋转控制 */}
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePatternTransform(pattern, 'rotateBack');
                }}
                className="flex-1 p-2 rounded bg-green-500 hover:bg-green-600 transition-colors"
                title="逆时针旋转"
              >
                <RotateCcw size={12} className="mx-auto" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePatternTransform(pattern, 'rotate');
                }}
                className="flex-1 p-2 rounded bg-green-500 hover:bg-green-600 transition-colors"
                title="顺时针旋转"
              >
                <RotateCw size={12} className="mx-auto" />
              </button>
            </div>
            
            {/* 翻转控制 */}
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePatternTransform(pattern, 'flipH');
                }}
                className="flex-1 p-2 rounded bg-purple-500 hover:bg-purple-600 transition-colors"
                title="水平翻转"
              >
                <FlipHorizontal size={12} className="mx-auto" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePatternTransform(pattern, 'flipV');
                }}
                className="flex-1 p-2 rounded bg-purple-500 hover:bg-purple-600 transition-colors"
                title="垂直翻转"
              >
                <FlipVertical size={12} className="mx-auto" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-xl border border-white/20 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">图案库</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        
        {/* 搜索和分类 */}
        <div className="p-4 space-y-4 border-b border-white/10">
          {/* 搜索框 */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="搜索图案..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
            />
          </div>
          
          {/* 分类标签 */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setPreviewPattern(null);
                    setSearchTerm('');
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    {
                      'bg-blue-500 text-white shadow-lg shadow-blue-500/30': isActive,
                      'bg-white/10 text-white/80 hover:bg-white/20': !isActive
                    }
                  )}
                  title={category.description}
                >
                  <Icon size={14} />
                  <span>{category.name}</span>
                  <span className="text-xs opacity-60">
                    ({getCategoryCount(category.id)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* 图案网格 */}
        <div className="flex-1 overflow-auto p-4">
          {filteredPatterns.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredPatterns.map(renderPatternCard)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/60">
              <Search size={48} className="mb-4" />
              <p className="text-lg font-medium">未找到匹配的图案</p>
              <p className="text-sm">尝试调整搜索条件或选择其他分类</p>
            </div>
          )}
        </div>
        
        {/* 底部操作栏 */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedPattern && (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <span>已选择:</span>
                <span className="font-medium">{selectedPattern.name}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
              title="导入图案"
            >
              <Upload size={14} />
              <span>导入</span>
            </button>
            
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
              title="导出图案"
            >
              <Download size={14} />
              <span>导出</span>
            </button>
            
            <button
              onClick={() => setSelectedPattern(null)}
              className="px-4 py-1.5 rounded-lg bg-gray-500 hover:bg-gray-600 text-white text-sm transition-colors"
            >
              清除选择
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatternLibrary;