import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollapse } from './useCollapse';

describe('useCollapse', () => {
  it('должен инициализироваться значением по умолчанию', () => {
    const { result } = renderHook(() => useCollapse(false));
    
    expect(result.current.isCollapsed).toBe(false);
  });

  it('должен инициализироваться как свёрнутый', () => {
    const { result } = renderHook(() => useCollapse(true));
    
    expect(result.current.isCollapsed).toBe(true);
  });

  it('должен переключаться при вызове toggle', () => {
    const { result } = renderHook(() => useCollapse(false));
    
    expect(result.current.isCollapsed).toBe(false);
    
    act(() => {
      result.current.toggle();
    });
    
    expect(result.current.isCollapsed).toBe(true);
    
    act(() => {
      result.current.toggle();
    });
    
    expect(result.current.isCollapsed).toBe(false);
  });

  it('должен устанавливать состояние явно', () => {
    const { result } = renderHook(() => useCollapse(false));
    
    expect(result.current.isCollapsed).toBe(false);
    
    act(() => {
      result.current.setIsCollapsed(true);
    });
    
    expect(result.current.isCollapsed).toBe(true);
    
    act(() => {
      result.current.setIsCollapsed(false);
    });
    
    expect(result.current.isCollapsed).toBe(false);
  });

  it('должен сворачивать панель', () => {
    const { result } = renderHook(() => useCollapse(false));
    
    expect(result.current.isCollapsed).toBe(false);
    
    act(() => {
      result.current.collapse();
    });
    
    expect(result.current.isCollapsed).toBe(true);
    
    // Повторный вызов не должен менять состояние
    act(() => {
      result.current.collapse();
    });
    
    expect(result.current.isCollapsed).toBe(true);
  });

  it('должен разворачивать панель', () => {
    const { result } = renderHook(() => useCollapse(true));
    
    expect(result.current.isCollapsed).toBe(true);
    
    act(() => {
      result.current.expand();
    });
    
    expect(result.current.isCollapsed).toBe(false);
    
    // Повторный вызов не должен менять состояние
    act(() => {
      result.current.expand();
    });
    
    expect(result.current.isCollapsed).toBe(false);
  });

  it('должен работать с несколькими независимыми экземплярами', () => {
    const { result: result1 } = renderHook(() => useCollapse(false));
    const { result: result2 } = renderHook(() => useCollapse(true));
    
    expect(result1.current.isCollapsed).toBe(false);
    expect(result2.current.isCollapsed).toBe(true);
    
    act(() => {
      result1.current.toggle();
    });
    
    expect(result1.current.isCollapsed).toBe(true);
    expect(result2.current.isCollapsed).toBe(true); // не изменился
    
    act(() => {
      result2.current.toggle();
    });
    
    expect(result1.current.isCollapsed).toBe(true); // не изменился
    expect(result2.current.isCollapsed).toBe(false);
  });
});
