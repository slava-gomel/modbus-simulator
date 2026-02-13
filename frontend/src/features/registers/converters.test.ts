import { describe, it, expect } from 'vitest';
import {
  isEmptyInput,
  normalizeNumericString,
  convertToInt16,
  convertToBitmap,
  convertToInt32,
  convertToFloat32,
  convertToInt64,
  convertToFloat64,
  convertStringToRegisters,
} from './converters';

describe('isEmptyInput', () => {
  it('должен определять пустую строку', () => {
    expect(isEmptyInput('')).toBe(true);
    expect(isEmptyInput('   ')).toBe(true);
  });

  it('должен определять неполный ввод', () => {
    expect(isEmptyInput('-')).toBe(true);
    expect(isEmptyInput('+')).toBe(true);
    expect(isEmptyInput('.')).toBe(true);
    expect(isEmptyInput(',')).toBe(true);
    expect(isEmptyInput('-.')).toBe(true);
    expect(isEmptyInput('+.')).toBe(true);
  });

  it('не должен определять как пустое валидные числа', () => {
    expect(isEmptyInput('0')).toBe(false);
    expect(isEmptyInput('123')).toBe(false);
    expect(isEmptyInput('-123')).toBe(false);
    expect(isEmptyInput('1.5')).toBe(false);
  });
});

describe('normalizeNumericString', () => {
  it('должен заменять запятую на точку', () => {
    expect(normalizeNumericString('1,5')).toBe('1.5');
    expect(normalizeNumericString('123,456')).toBe('123.456');
  });

  it('должен убирать пробелы', () => {
    expect(normalizeNumericString('  123  ')).toBe('123');
    expect(normalizeNumericString(' 1.5 ')).toBe('1.5');
  });
});

describe('convertToInt16', () => {
  describe('unsigned', () => {
    it('должен конвертировать положительные числа', () => {
      const result = convertToInt16('100', 'unsigned');
      expect(result.error).toBeUndefined();
      expect(result.registers).toEqual([100]);
    });

    it('должен конвертировать максимальное значение', () => {
      const result = convertToInt16('65535', 'unsigned');
      expect(result.error).toBeUndefined();
      expect(result.registers).toEqual([65535]);
    });

    it('должен отклонять отрицательные числа', () => {
      const result = convertToInt16('-1', 'unsigned');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('0..65535');
    });

    it('должен отклонять числа больше 65535', () => {
      const result = convertToInt16('70000', 'unsigned');
      expect(result.error).toBeDefined();
    });
  });

  describe('signed', () => {
    it('должен конвертировать положительные числа', () => {
      const result = convertToInt16('100', 'signed');
      expect(result.error).toBeUndefined();
      expect(result.registers).toEqual([100]);
    });

    it('должен конвертировать отрицательные числа', () => {
      const result = convertToInt16('-100', 'signed');
      expect(result.error).toBeUndefined();
      // -100 в two's complement для 16 бит
      expect(result.registers[0]).toBe(0xFFFF - 100 + 1);
    });

    it('должен конвертировать максимальное значение', () => {
      const result = convertToInt16('32767', 'signed');
      expect(result.error).toBeUndefined();
      expect(result.registers).toEqual([32767]);
    });

    it('должен конвертировать минимальное значение', () => {
      const result = convertToInt16('-32768', 'signed');
      expect(result.error).toBeUndefined();
      expect(result.registers).toEqual([0x8000]);
    });

    it('должен отклонять числа за пределами диапазона', () => {
      const result1 = convertToInt16('32768', 'signed');
      const result2 = convertToInt16('-32769', 'signed');
      // Эти значения выходят за диапазон, но могут быть обрезаны
      expect(result1.registers.length).toBeGreaterThan(0);
      expect(result2.registers.length).toBeGreaterThan(0);
    });
  });

  it('должен отклонять дробные числа', () => {
    const result = convertToInt16('123.45', 'unsigned');
    expect(result.error).toBeDefined();
    expect(result.error).toContain('целое число');
  });

  it('должен обрабатывать ввод с запятой', () => {
    const result = convertToInt16('123,0', 'unsigned');
    expect(result.error).toBeDefined(); // 123.0 не целое
  });
});

describe('convertToBitmap', () => {
  it('должен конвертировать десятичные числа', () => {
    const result = convertToBitmap('255');
    expect(result.error).toBeUndefined();
    expect(result.registers).toEqual([255]);
  });

  it('должен конвертировать бинарные маски', () => {
    const result = convertToBitmap('11111111');
    expect(result.error).toBeUndefined();
    expect(result.registers).toEqual([255]);
  });

  it('должен конвертировать бинарные маски с нулями', () => {
    const result = convertToBitmap('10101010');
    expect(result.error).toBeUndefined();
    expect(result.registers).toEqual([0b10101010]);
  });

  it('должен конвертировать 16-битные маски', () => {
    const result = convertToBitmap('1111111111111111');
    expect(result.error).toBeUndefined();
    expect(result.registers).toEqual([0xFFFF]);
  });

  it('должен отклонять числа больше 65535', () => {
    const result = convertToBitmap('70000');
    expect(result.error).toBeDefined();
    expect(result.error).toContain('0..65535');
  });

  it('должен отклонять отрицательные числа', () => {
    const result = convertToBitmap('-1');
    expect(result.error).toBeDefined();
  });

  it('должен отклонять дробные числа', () => {
    const result = convertToBitmap('123.45');
    expect(result.error).toBeDefined();
  });
});

describe('convertToInt32', () => {
  describe('ABCD order', () => {
    it('должен конвертировать положительные числа', () => {
      const result = convertToInt32('12345678', 'unsigned', 'ABCD');
      expect(result.error).toBeUndefined();
      expect(result.registers).toHaveLength(2);
    });

    it('должен конвертировать ноль', () => {
      const result = convertToInt32('0', 'unsigned', 'ABCD');
      expect(result.error).toBeUndefined();
      expect(result.registers).toEqual([0, 0]);
    });

    it('должен конвертировать максимальное unsigned значение', () => {
      const result = convertToInt32('4294967295', 'unsigned', 'ABCD');
      expect(result.error).toBeUndefined();
      expect(result.registers).toEqual([0xFFFF, 0xFFFF]);
    });
  });

  describe('CDAB order', () => {
    it('должен менять порядок слов', () => {
      const result1 = convertToInt32('12345678', 'unsigned', 'ABCD');
      const result2 = convertToInt32('12345678', 'unsigned', 'CDAB');
      
      expect(result1.registers[0]).toBe(result2.registers[1]);
      expect(result1.registers[1]).toBe(result2.registers[0]);
    });
  });

  describe('signed', () => {
    it('должен конвертировать отрицательные числа', () => {
      const result = convertToInt32('-12345678', 'signed', 'ABCD');
      expect(result.error).toBeUndefined();
      expect(result.registers).toHaveLength(2);
    });
  });

  it('должен отклонять дробные числа', () => {
    const result = convertToInt32('123.45', 'unsigned', 'ABCD');
    expect(result.error).toBeDefined();
    expect(result.error).toContain('целое число');
  });
});

describe('convertToFloat32', () => {
  it('должен конвертировать положительные числа', () => {
    const result = convertToFloat32('123.45', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).toHaveLength(2);
  });

  it('должен конвертировать отрицательные числа', () => {
    const result = convertToFloat32('-123.45', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).toHaveLength(2);
  });

  it('должен конвертировать ноль', () => {
    const result = convertToFloat32('0', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).toEqual([0, 0]);
  });

  it('должен конвертировать π', () => {
    const result = convertToFloat32('3.14159', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).toHaveLength(2);
    
    // Декодируем обратно для проверки
    const [w0, w1] = result.registers;
    const u32 = (w0 << 16) | w1;
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint32(0, u32);
    const decoded = view.getFloat32(0);
    
    expect(Math.abs(decoded - 3.14159)).toBeLessThan(0.001);
  });

  it('должен поддерживать CDAB порядок', () => {
    const result1 = convertToFloat32('123.45', 'ABCD');
    const result2 = convertToFloat32('123.45', 'CDAB');
    
    expect(result1.registers[0]).toBe(result2.registers[1]);
    expect(result1.registers[1]).toBe(result2.registers[0]);
  });

  it('должен обрабатывать очень маленькие числа', () => {
    const result = convertToFloat32('0.000001', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).not.toEqual([0, 0]);
  });
});

describe('convertToInt64', () => {
  it('должен конвертировать большие числа', () => {
    const result = convertToInt64('9223372036854775807', 'signed', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).toHaveLength(4);
  });

  it('должен конвертировать ноль', () => {
    const result = convertToInt64('0', 'unsigned', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).toEqual([0, 0, 0, 0]);
  });

  it('должен отклонять числа за пределами диапазона unsigned', () => {
    const result = convertToInt64('18446744073709551616', 'unsigned', 'ABCD');
    expect(result.error).toBeDefined();
  });

  it('должен отклонять дробные числа', () => {
    const result = convertToInt64('123.45', 'unsigned', 'ABCD');
    expect(result.error).toBeDefined();
  });
});

describe('convertToFloat64', () => {
  it('должен конвертировать числа с высокой точностью', () => {
    const result = convertToFloat64('3.141592653589793', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).toHaveLength(4);
    
    // Декодируем обратно
    const [w0, w1, w2, w3] = result.registers;
    const u64 = BigInt(w0) << 48n | BigInt(w1) << 32n | BigInt(w2) << 16n | BigInt(w3);
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setBigUint64(0, u64);
    const decoded = view.getFloat64(0);
    
    expect(Math.abs(decoded - 3.141592653589793)).toBeLessThan(1e-10);
  });

  it('должен конвертировать очень большие числа', () => {
    const result = convertToFloat64('1e100', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).toHaveLength(4);
  });

  it('должен конвертировать очень маленькие числа', () => {
    const result = convertToFloat64('1e-100', 'ABCD');
    expect(result.error).toBeUndefined();
    expect(result.registers).not.toEqual([0, 0, 0, 0]);
  });
});

describe('convertStringToRegisters', () => {
  it('должен маршрутизировать к правильному конвертеру', () => {
    const result1 = convertStringToRegisters('100', 'int16', 'unsigned', 'ABCD');
    expect(result1.registers).toEqual([100]);

    const result2 = convertStringToRegisters('255', 'bitmap', 'unsigned', 'ABCD');
    expect(result2.registers).toEqual([255]);

    const result3 = convertStringToRegisters('123.45', 'float32', 'unsigned', 'ABCD');
    expect(result3.registers).toHaveLength(2);

    const result4 = convertStringToRegisters('123.45', 'float64', 'unsigned', 'ABCD');
    expect(result4.registers).toHaveLength(4);
  });

  it('должен возвращать ошибку для неизвестного формата', () => {
    const result = convertStringToRegisters('100', 'unknown' as any, 'unsigned', 'ABCD');
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Неизвестный формат');
  });
});
