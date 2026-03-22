import { useEffect, useRef, useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseDragOptions {
  position: Position;
  onPositionChange: (pos: Position) => void;
  minWidth?: number;
  minHeight?: number;
}

export function useDrag({ position, onPositionChange, minWidth = 300, minHeight = 200 }: UseDragOptions) {
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  
  // 상태 동기화 방식 대신, ref에 시작값을 고정해서 누적 이벤트 부하 감소
  const startPos = useRef({ x: 0, y: 0 });
  const startRect = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startRect.current = { ...position };
    document.body.style.userSelect = 'none';
  }, [position]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startRect.current = { ...position };
    document.body.style.userSelect = 'none';
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current && !isResizing.current) return;
      
      requestAnimationFrame(() => {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;

        if (isDragging.current) {
          let newX = startRect.current.x + dx;
          let newY = startRect.current.y + dy;
          
          // 상단 타이틀 바 드래그 화면 이탈 방지
          if (newY < 0) newY = 0;
          if (newX < -startRect.current.w + 50) newX = -startRect.current.w + 50;
          if (newX > window.innerWidth - 50) newX = window.innerWidth - 50;
          
          // 화면 아래로 완전히 숨는 것 방지
          if (newY > window.innerHeight - 30) newY = window.innerHeight - 30;

          onPositionChange({
            ...position, // 혹시 모를 내부 불변성 유지
            x: newX,
            y: newY,
            w: startRect.current.w,
            h: startRect.current.h,
          });
        } else if (isResizing.current) {
          let newW = startRect.current.w + dx;
          let newH = startRect.current.h + dy;

          if (newW < minWidth) newW = minWidth;
          if (newH < minHeight) newH = minHeight;

          onPositionChange({
            ...position,
            x: startRect.current.x,
            y: startRect.current.y,
            w: newW,
            h: newH,
          });
        }
      });
    };

    const handleMouseUp = () => {
      if (isDragging.current || isResizing.current) {
        isDragging.current = false;
        isResizing.current = false;
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minWidth, minHeight, onPositionChange, position]);

  return { handleDragStart, handleResizeStart };
}
