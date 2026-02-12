from __future__ import annotations

"""
Вспомогательные функции для кодирования числовых значений
в 16‑битные Modbus‑регистры.

Генератор сигналов использует их для записи INT16 / FLOAT32 / FLOAT64
в holding‑регистры.
"""

import struct
from typing import List


def encode_int16(value: int) -> int:
    """
    Преобразовать целое число в 16‑битное беззнаковое значение.

    Отрицательные значения интерпретируются как signed и приводятся
    в диапазон 0..0xFFFF.
    """

    return value & 0xFFFF


def encode_float32(value: float) -> List[int]:
    """
    Кодирование float32 в два 16‑битных регистра в порядке ABCD.
    """

    # big‑endian float32 → 4 байта
    packed = struct.pack(">f", float(value))
    hi, lo = struct.unpack(">HH", packed)
    return [hi & 0xFFFF, lo & 0xFFFF]


def encode_float64(value: float) -> List[int]:
    """
    Кодирование float64 в четыре 16‑битных регистра в порядке ABCD.
    """

    packed = struct.pack(">d", float(value))
    w0, w1, w2, w3 = struct.unpack(">HHHH", packed)
    return [w0 & 0xFFFF, w1 & 0xFFFF, w2 & 0xFFFF, w3 & 0xFFFF]

