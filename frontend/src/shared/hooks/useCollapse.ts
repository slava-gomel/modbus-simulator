import { useState } from "react";

/**
 * Хук для управления состоянием сворачивания панелей
 * @param initialState Начальное состояние (по умолчанию false - развёрнуто)
 * @returns [collapsed, toggleCollapsed]
 */
export const useCollapse = (initialState = false): [boolean, () => void] => {
  const [collapsed, setCollapsed] = useState(initialState);
  
  const toggle = () => setCollapsed(prev => !prev);
  
  return [collapsed, toggle];
};
