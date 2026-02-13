"""Тесты для модуля encoding_utils - конвертация данных в регистры Modbus."""
from __future__ import annotations

import pytest

from app.encoding_utils import encode_int16, encode_float32, encode_float64


class TestEncodeInt16:
    """Тесты конвертации INT16 в 16-битный регистр."""

    def test_encode_positive_number(self) -> None:
        """Положительное число."""
        result = encode_int16(100)
        assert result == 100

    def test_encode_negative_number(self) -> None:
        """Отрицательное число (two's complement)."""
        result = encode_int16(-100)
        assert result == 0xFFFF - 100 + 1  # two's complement

    def test_encode_max_positive(self) -> None:
        """Максимальное положительное значение для signed."""
        result = encode_int16(32767)
        assert result == 32767

    def test_encode_min_negative(self) -> None:
        """Минимальное отрицательное значение для signed."""
        result = encode_int16(-32768)
        assert result == 0x8000

    def test_encode_large_unsigned(self) -> None:
        """Большое unsigned число."""
        result = encode_int16(50000)
        assert result == 50000

    def test_encode_max_unsigned(self) -> None:
        """Максимальное unsigned значение."""
        result = encode_int16(65535)
        assert result == 65535

    def test_encode_with_mask(self) -> None:
        """Значения обрезаются маской 0xFFFF."""
        # Число больше 16 бит
        result = encode_int16(0x10000)
        assert result == 0

        result = encode_int16(0x10001)
        assert result == 1

    def test_encode_zero(self) -> None:
        """Ноль."""
        result = encode_int16(0)
        assert result == 0


class TestEncodeFloat32:
    """Тесты конвертации FLOAT32 в 2 регистра."""

    def test_encode_positive_float(self) -> None:
        """Положительное число."""
        result = encode_float32(123.45)
        assert len(result) == 2
        assert all(isinstance(x, int) for x in result)
        assert all(0 <= x <= 0xFFFF for x in result)

    def test_encode_negative_float(self) -> None:
        """Отрицательное число."""
        result = encode_float32(-123.45)
        assert len(result) == 2
        assert all(isinstance(x, int) for x in result)

    def test_encode_zero(self) -> None:
        """Ноль."""
        result = encode_float32(0.0)
        assert len(result) == 2
        assert result == [0, 0]

    def test_encode_small_float(self) -> None:
        """Маленькое число."""
        result = encode_float32(0.000001)
        assert len(result) == 2
        # Проверяем, что значение не нулевое
        assert result != [0, 0]

    def test_encode_large_float(self) -> None:
        """Большое число."""
        result = encode_float32(1234567.89)
        assert len(result) == 2

    def test_encode_pi(self) -> None:
        """Число π."""
        result = encode_float32(3.14159265)
        assert len(result) == 2
        # Проверяем, что можно декодировать обратно с приемлемой точностью
        import struct
        
        w0, w1 = result
        u32 = (w0 << 16) | w1
        packed = struct.pack(">I", u32)
        decoded = struct.unpack(">f", packed)[0]
        assert abs(decoded - 3.14159265) < 0.001


class TestEncodeFloat64:
    """Тесты конвертации FLOAT64 в 4 регистра."""

    def test_encode_positive_double(self) -> None:
        """Положительное число."""
        result = encode_float64(123456.789012)
        assert len(result) == 4
        assert all(isinstance(x, int) for x in result)
        assert all(0 <= x <= 0xFFFF for x in result)

    def test_encode_negative_double(self) -> None:
        """Отрицательное число."""
        result = encode_float64(-123456.789012)
        assert len(result) == 4
        assert all(isinstance(x, int) for x in result)

    def test_encode_zero_double(self) -> None:
        """Ноль."""
        result = encode_float64(0.0)
        assert len(result) == 4
        assert result == [0, 0, 0, 0]

    def test_encode_very_small_double(self) -> None:
        """Очень маленькое число."""
        result = encode_float64(1e-100)
        assert len(result) == 4
        assert result != [0, 0, 0, 0]

    def test_encode_very_large_double(self) -> None:
        """Очень большое число."""
        result = encode_float64(1e100)
        assert len(result) == 4

    def test_encode_pi_high_precision(self) -> None:
        """Число π с высокой точностью."""
        result = encode_float64(3.141592653589793)
        assert len(result) == 4
        # Проверяем декодирование с высокой точностью
        import struct
        
        words = result
        u64 = (
            (words[0] << 48)
            | (words[1] << 32)
            | (words[2] << 16)
            | words[3]
        )
        packed = struct.pack(">Q", u64)
        decoded = struct.unpack(">d", packed)[0]
        assert abs(decoded - 3.141592653589793) < 1e-10

    def test_encode_special_value_infinity(self) -> None:
        """Бесконечность."""
        result = encode_float64(float("inf"))
        assert len(result) == 4
        # Проверяем, что это корректное представление infinity

    def test_encode_special_value_negative_infinity(self) -> None:
        """Отрицательная бесконечность."""
        result = encode_float64(float("-inf"))
        assert len(result) == 4
