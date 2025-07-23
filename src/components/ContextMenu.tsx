// 右键上下文菜单组件
// 提供复制、平移、旋转、翻转、删除等操作

import React from 'react';
import { Copy, Move, RotateCw, FlipHorizontal, FlipVertical, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';

// 菜单项类型
export type ContextMenuAction = 'copy' | 'pan' | 'rotate' | 'flipH' | 'flipV' | 'delete' | 'cancel';

// 组件属性接口
interface ContextMenuProps {
  x: number;                    // 菜单X坐标
  y: number;                    // 菜单Y坐标
  visible: boolean;             // 是否显示
  onAction: (action: ContextMenuAction) => void; // 操作回调
  onClose: () => void;          // 关闭回调
}

// 菜单项配置
const menuItems = [
  {
    action: 'copy' as ContextMenuAction,
    label: '复制',
    icon: Copy,
    description: '复制选中区域'
  },
  {
    action: 'pan' as ContextMenuAction,
    label: '平移',
    icon: Move,
    description: '移动选中区域'
  },
  {
    action: 'rotate' as ContextMenuAction,
    label: '旋转',
    icon: RotateCw,
    description: '顺时针旋转90度'
  },
  {
    action: 'flipH' as ContextMenuAction,
    label: '水平翻转',
    icon: FlipHorizontal,
    description: '水平翻转选中区域'
  },
  {
    action: 'flipV' as ContextMenuAction,
    label: '垂直翻转',
    icon: FlipVertical,
    description: '垂直翻转选中区域'
  },
  {
    action: 'delete' as ContextMenuAction,
    label: '删除',
    icon: Trash2,
    description: '清空选中区域'
  }
];

/**
 * 右键上下文菜单组件
 */
export function ContextMenu({ x, y, visible, onAction, onClose }: ContextMenuProps) {
  if (!visible) return null;

  // 处理菜单项点击
  const handleItemClick = (action: ContextMenuAction) => {
    onAction(action);
    onClose();
  };

  // 处理背景点击（关闭菜单）
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 z-40"
        onClick={handleBackdropClick}
      />
      
      {/* 菜单内容 */}
      <div
        className={cn(
          'fixed z-50 bg-gray-900/95 backdrop-blur-sm',
          'border border-gray-700 rounded-lg shadow-2xl',
          'min-w-[180px] py-2',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
        style={{
          left: x,
          top: y,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* 关闭按钮 */}
        <div className="flex justify-between items-center px-3 pb-2 border-b border-gray-700">
          <span className="text-sm font-medium text-gray-300">操作菜单</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {/* 菜单项列表 */}
        <div className="py-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.action}
                onClick={() => handleItemClick(item.action)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2',
                  'text-left text-sm text-gray-200',
                  'hover:bg-gray-700/50 transition-colors',
                  'focus:outline-none focus:bg-gray-700/50'
                )}
                title={item.description}
              >
                <Icon className="w-4 h-4 text-gray-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* 取消按钮 */}
        <div className="border-t border-gray-700 pt-1 mt-1">
          <button
            onClick={() => handleItemClick('cancel')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2',
              'text-left text-sm text-gray-400',
              'hover:bg-gray-700/50 transition-colors',
              'focus:outline-none focus:bg-gray-700/50'
            )}
          >
            <X className="w-4 h-4" />
            <span>取消</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default ContextMenu;