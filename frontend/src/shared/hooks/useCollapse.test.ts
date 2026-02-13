import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollapse } from './useCollapse';

describe('useCollapse', () => {
  it('должен инициализироваться значением по умолчанию', () => {
    const { result } = renderHook(() => useCollapse(false));
    
    const [collapsed] = result.current;
    expect(collapsed).toBe(false);
  });

  it('должен инициализироваться как свёрнутый', () => {
    const { result } = renderHook(() => useCollapse(true));
    
    const [collapsed] = result.current;
    expect(collapsed).toBe(true);
  });

  it('должен переключаться при вызове toggle', () => {
    const { result } = renderHook(() => useCollapse(false));
    
    expect(result.current[0]).toBe(false);
    
    act(() => {
      result.current[1](); // toggle
    });
    
    expect(result.current[0]).toBe(true);
    
    act(() => {
      result.current[1](); // toggle
    });
    
    expect(result.current[0]).toBe(false);
  });

  it('должен работать с несколькими независимыми экземплярами', () => {
    const { result: result1 } = renderHook(() => useCollapse(false));
    const { result: result2 } = renderHook(() => useCollapse(true));
    
    expect(result1.current[0]).toBe(false);
    expect(result2.current[0]).toBe(true);
    
    act(() => {
      result1.current[1](); // toggle первого
    });
    
    expect(result1.current[0]).toBe(true);
    expect(result2.current[0]).toBe(true); // не изменился
    
    act(() => {
      result2.current[1](); // toggle второго
    });
    
    expect(result1.current[0]).toBe(true); // не изменился
    expect(result2.current[0]).toBe(false);
  });

  it('должен возвращать массив из двух элементов', () => {
    const { result } = renderHook(() => useCollapse());
    
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current).toHaveLength(2);
    expect(typeof result.current[0]).toBe('boolean');
    expect(typeof result.current[1]).toBe('function');
  });
});
