import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePolling } from './usePolling';

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('должен вызывать callback с заданным интервалом', async () => {
    const callback = vi.fn();
    const interval = 1000;

    renderHook(() => usePolling(callback, interval));

    // Изначально callback не вызван
    expect(callback).not.toHaveBeenCalled();

    // Проматываем время
    vi.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('должен останавливаться при unmount', () => {
    const callback = vi.fn();
    const interval = 1000;

    const { unmount } = renderHook(() => usePolling(callback, interval));

    vi.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();

    vi.advanceTimersByTime(interval * 5);
    // После unmount callback больше не вызывается
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('должен обновлять callback без перезапуска таймера', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const interval = 1000;

    const { rerender } = renderHook(
      ({ cb }) => usePolling(cb, interval),
      { initialProps: { cb: callback1 } }
    );

    vi.advanceTimersByTime(interval);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    // Меняем callback
    rerender({ cb: callback2 });

    vi.advanceTimersByTime(interval);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('должен перезапускаться при изменении интервала', () => {
    const callback = vi.fn();
    let interval = 1000;

    const { rerender } = renderHook(() => usePolling(callback, interval));

    vi.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(1);

    // Меняем интервал
    interval = 500;
    rerender();

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('должен обрабатывать интервал null (отключение polling)', () => {
    const callback = vi.fn();

    const { rerender } = renderHook(
      ({ int }) => usePolling(callback, int),
      { initialProps: { int: 1000 as number | null } }
    );

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Отключаем polling
    rerender({ int: null });

    vi.advanceTimersByTime(10000);
    // Callback больше не вызывается
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
