# Modbus Functions Tests

Comprehensive test suite for all implemented Modbus TCP functions (FC01-FC06, FC15-FC16).

## Test Structure

### Unit Tests (`test_modbus_core.py`) - 41 тест

Tests for `ModbusSimulatorCore` and `RegisterBlock` classes.

#### RegisterBlock Tests (9 тестов)

- ✅ Инициализация с нулями
- ✅ Чтение в пределах диапазона
- ✅ Чтение на границах
- ✅ Ошибка при выходе за границы
- ✅ Запись holding регистра
- ✅ Маскирование до 16 бит
- ✅ Запись bool coils (True/False)
- ✅ Ошибка при выходе за границы записи

#### FC01: Read Coils (3 теста)

- ✅ Чтение по умолчанию (все нули)
- ✅ Чтение после записи
- ✅ Чтение диапазона coils

#### FC02: Read Discrete Inputs (2 теста)

- ✅ Чтение по умолчанию (все нули)
- ✅ Чтение после ручной установки значений

#### FC03: Read Holding Registers (3 теста)

- ✅ Чтение по умолчанию (все нули)
- ✅ Чтение после записи
- ✅ Чтение 16-битных значений

#### FC04: Read Input Registers (2 теста)

- ✅ Чтение по умолчанию (все нули)
- ✅ Чтение после ручной установки значений

#### FC05: Write Single Coil (3 теста)

- ✅ Запись True
- ✅ Запись False
- ✅ Любое ненулевое значение = True

#### FC06: Write Single Register (3 теста)

- ✅ Запись одного holding регистра
- ✅ Запись максимального 16-битного значения (0xFFFF)
- ✅ Перезапись существующего значения

#### FC15: Write Multiple Coils (5 тестов)

- ✅ Запись нескольких coils
- ✅ Запись всех coils как True
- ✅ Запись всех coils как False
- ✅ Запись пустого списка (граничный случай)
- ✅ Ошибка при выходе за границы

#### FC16: Write Multiple Registers (6 тестов)

- ✅ Запись нескольких holding регистров
- ✅ Запись 16-битных значений
- ✅ Перезапись существующих значений
- ✅ Частичная перезапись диапазона
- ✅ Запись пустого списка (граничный случай)
- ✅ Ошибка при выходе за границы

#### Integration Scenarios (5 тестов)

- ✅ Множественные операции на одних регистрах
- ✅ Независимость разных типов регистров
- ✅ Работа с граничными адресами
- ✅ Паттерны coils (шахматный, все единицы)
- ✅ Последовательная запись holding регистров

### Integration Tests (`test_modbus_integration.py`) - 18 тестов

Tests for `InMemoryDataStore` (adapter between pymodbus and ModbusSimulatorCore).

#### Function Code Tests (14 тестов)

- ✅ FC01: Read Coils (2 теста)
  - Чтение по умолчанию
  - Чтение после записи через core
  
- ✅ FC02: Read Discrete Inputs (1 тест)
  - Чтение после установки значений
  
- ✅ FC03: Read Holding Registers (2 теста)
  - Чтение по умолчанию
  - Чтение после записи через core
  
- ✅ FC04: Read Input Registers (1 тест)
  - Чтение после установки значений
  
- ✅ FC05: Write Single Coil (2 теста)
  - Запись True через datastore
  - Запись False через datastore
  
- ✅ FC06: Write Single Register (2 теста)
  - Запись одного регистра через datastore
  - Запись максимального 16-битного значения
  
- ✅ FC15: Write Multiple Coils (2 теста)
  - Запись нескольких coils
  - Запись всех coils как True
  
- ✅ FC16: Write Multiple Registers (2 теста)
  - Запись нескольких регистров
  - Запись 16-битных значений

#### Complex Scenarios (4 теста)

- ✅ Последовательность чтение-запись-чтение
- ✅ Смешанные операции с coils и регистрами
- ✅ Работа с граничными адресами
- ✅ Большие batch операции (50 регистров)

## Running Tests

### All Modbus tests

```bash
cd backend
pytest tests/test_modbus_core.py tests/test_modbus_integration.py -v
```

### Unit tests only

```bash
pytest tests/test_modbus_core.py -v
```

### Integration tests only

```bash
pytest tests/test_modbus_integration.py -v
```

### Specific function code

```bash
# FC01: Read Coils
pytest tests/test_modbus_core.py -k "fc01" -v

# FC16: Write Multiple Registers
pytest tests/test_modbus_core.py -k "fc16" -v
```

### With coverage

```bash
pytest tests/test_modbus_core.py tests/test_modbus_integration.py --cov=app.modbus_core --cov=app.modbus_server --cov-report=html
```

## Test Matrix

| Function Code | Description | Unit Tests | Integration Tests | Total |
|--------------|-------------|------------|-------------------|-------|
| FC01 | Read Coils | 3 | 2 | 5 |
| FC02 | Read Discrete Inputs | 2 | 1 | 3 |
| FC03 | Read Holding Registers | 3 | 2 | 5 |
| FC04 | Read Input Registers | 2 | 1 | 3 |
| FC05 | Write Single Coil | 3 | 2 | 5 |
| FC06 | Write Single Register | 3 | 2 | 5 |
| FC15 | Write Multiple Coils | 5 | 2 | 7 |
| FC16 | Write Multiple Registers | 6 | 2 | 8 |
| RegisterBlock | Core functionality | 9 | - | 9 |
| Scenarios | Complex workflows | 5 | 4 | 9 |
| **TOTAL** | | **41** | **18** | **59** |

## Coverage

### ModbusSimulatorCore

- ✅ 100% coverage всех публичных методов
- ✅ Все Modbus функции (FC01-FC06, FC15-FC16)
- ✅ Граничные случаи (пустые списки, max values, границы массивов)
- ✅ Обработка ошибок (выход за границы)

### InMemoryDataStore

- ✅ Корректная маршрутизация к core методам
- ✅ Все function codes (fx=1,2,3,4,5,6,15,16)
- ✅ getValues и setValues интерфейсы
- ✅ Комплексные сценарии использования

### RegisterBlock

- ✅ Инициализация и хранение данных
- ✅ Чтение с валидацией диапазона
- ✅ Запись с валидацией диапазона
- ✅ Boolean (coils) и integer (registers) режимы
- ✅ Маскирование 16-битных значений

## Performance

Все тесты очень быстрые (без I/O операций):

- `test_modbus_core.py` (41 тест): ~0.05s
- `test_modbus_integration.py` (18 тестов): ~0.15s
- **Итого: ~0.2s для 59 тестов**

## Key Test Patterns

### Unit Test Pattern

```python
def test_fc03_read_holding_after_write(self, core: ModbusSimulatorCore) -> None:
    """FC03: чтение holding регистров после записи."""
    # Arrange
    core.write_single_holding_register(0, 100)
    core.write_single_holding_register(1, 200)
    
    # Act
    result = core.read_holding_registers(0, 5)
    
    # Assert
    expected = [100, 200, 0, 0, 0]
    assert result == expected
```

### Integration Test Pattern

```python
def test_fc06_write_single_register(
    self,
    datastore: InMemoryDataStore,
    core: ModbusSimulatorCore
) -> None:
    """FC06 (fx=6): запись одного holding регистра."""
    # Arrange & Act
    datastore.setValues(fx=6, address=5, values=[12345])
    
    # Assert через core
    assert core.read_holding_registers(5, 1) == [12345]
    
    # Assert через datastore (FC03)
    read_values = datastore.getValues(fx=3, address=5, count=1)
    assert read_values[0] == 12345
```

## Known Limitations

1. **No TCP Client Tests**: Integration tests use `InMemoryDataStore` directly instead of real TCP client connections. This is faster and more reliable for unit testing.

2. **Discrete Inputs & Input Registers**: These are read-only in Modbus protocol, but tests set values directly in core for testing purposes.

3. **No Concurrent Access Tests**: Current tests don't validate thread-safety or concurrent access scenarios.

## Future Improvements

- [ ] E2E tests with real Modbus TCP client (pymodbus.client.ModbusTcpClient)
- [ ] Concurrent access tests with threading
- [ ] Performance benchmarks for large batch operations
- [ ] Stress tests (1000+ registers)
- [ ] Error injection tests (network failures, corrupted data)
- [ ] Property-based testing with Hypothesis

## References

- [Modbus Protocol Specification](http://www.modbus.org/specs.php)
- [pymodbus Documentation](https://pymodbus.readthedocs.io/)
- ModbusSimulatorCore implementation: `backend/app/modbus_core.py`
- InMemoryDataStore implementation: `backend/app/modbus_server.py`
