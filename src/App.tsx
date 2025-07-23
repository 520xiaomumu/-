// 主应用组件 - 生命游戏现代化Web应用
// 提供路由管理和全局状态初始化

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useGameStore } from './lib/store';
import { GamePage } from './pages/GamePage';
import { isMobileDevice, isTouchDevice } from './lib/utils';

/**
 * 主应用组件
 * 负责路由配置、全局状态初始化和移动端适配
 */
function App() {
  // 获取游戏状态管理
  const { setMobile, setTouchMode, initializeEngine } = useGameStore();

  /**
   * 初始化应用
   */
  useEffect(() => {
    // 检测设备类型
    const mobile = isMobileDevice();
    const touch = isTouchDevice();
    
    // 设置移动端状态
    setMobile(mobile);
    setTouchMode(touch);
    
    // 初始化游戏引擎
    initializeEngine();
    
    // 设置页面标题
    document.title = '生命游戏 - Conway\'s Game of Life';
    
    // 设置视口元标签（移动端优化）
    if (mobile) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
      }
    }
    
    // 防止移动端双击缩放
    if (touch) {
      let lastTouchEnd = 0;
      document.addEventListener('touchend', (event) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    }
    
    // 监听窗口大小变化
    const handleResize = () => {
      const newMobile = isMobileDevice();
      if (newMobile !== mobile) {
        setMobile(newMobile);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [setMobile, setTouchMode, initializeEngine]);

  /**
   * 处理全局错误
   */
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      // 这里可以添加错误上报逻辑
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // 这里可以添加错误上报逻辑
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <Router>
      <div className="App min-h-screen bg-gray-900">
        {/* 路由配置 */}
        <Routes>
          {/* 主游戏页面 */}
          <Route path="/" element={<GamePage />} />
          
          {/* 游戏页面（兼容路径） */}
          <Route path="/game" element={<GamePage />} />
          
          {/* 默认重定向到主页 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* 全局通知组件 */}
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(17, 24, 39, 0.95)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)'
            },
            duration: 3000
          }}
        />
      </div>
    </Router>
  );
}

export default App;
