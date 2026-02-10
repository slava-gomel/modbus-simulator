"""Pytest configuration. Use a temp data dir so tests don't require /data."""
import os
import tempfile

# Set before app.main is imported (during test collection)
if "DATA_DIR" not in os.environ:
    os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="modbud_test_data_")
