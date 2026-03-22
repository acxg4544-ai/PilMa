import { useEffect, useRef } from 'react';

interface UseResizeOptions {
  minWidth: number;
  maxWidth: number;
  direction: 'left' | 'right';
  onResize: (width: number) => void;
  width: number;
}

export function useResize({ minWidth, maxWidth, direction, onResize, width }: UseResizeOptions) {
  const isResizing = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      requestAnimationFrame(() => {
        let newWidth = width;
        if (direction === 'right') {
          // 좌측에 붙은 패널(사이드바)의 우측 경계를 조작 -> 마우스의 X 좌표가 곧 패널의 너비
          newWidth = e.clientX;
        } else {
          // 우측에 붙은 패널(AI 패널)의 좌측 경계를 조작 -> 브라우저 폭에서 마우스 X를 뺀 값이 패널 너비
          newWidth = window.innerWidth - e.clientX;
        }
        
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        
        onResize(newWidth);
      });
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, minWidth, maxWidth, width, onResize]);

  return { handleMouseDown };
}
