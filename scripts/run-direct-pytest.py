"""Run pytest with the GenLayer Direct Mode Windows tempfile workaround."""

import os
import sys
import tempfile
from importlib import import_module


locked_paths = []
real_unlink = os.unlink


def windows_temp_unlink_compat(path, *args, **kwargs):
    try:
        return real_unlink(path, *args, **kwargs)
    except PermissionError:
        normalized = os.path.normcase(os.path.abspath(path))
        temp_root = os.path.normcase(os.path.abspath(tempfile.gettempdir())) + os.sep
        if os.name == "nt" and normalized.startswith(temp_root):
            locked_paths.append(path)
            return None
        raise


os.unlink = windows_temp_unlink_compat
try:
    import pytest
    import gltest.direct.loader as direct_loader
    import gltest.direct.vm as direct_vm_module

    real_inject_message = direct_loader._inject_message_to_fd0
    real_allocate_contract = direct_loader._allocate_contract
    real_refresh_message = direct_vm_module.VMContext._refresh_gl_message

    def inject_message_with_sdk_aliases(vm):
        import genlayer

        # gltest 0.29.2 expects these top-level aliases, while SDK 0.3.0-rc7
        # exposes the modules under genlayer.py.
        for legacy_name, current_name in (
            ("genlayer.calldata", "genlayer.py.calldata"),
            ("genlayer.types", "genlayer.py.types"),
            ("genlayer.storage", "genlayer.py.storage"),
            ("genlayer.storage._internal", "genlayer.py.storage._internal"),
            (
                "genlayer.storage._internal.generate",
                "genlayer.py.storage._internal.generate",
            ),
        ):
            module = import_module(current_name)
            sys.modules[legacy_name] = module
            if legacy_name in ("genlayer.calldata", "genlayer.types", "genlayer.storage"):
                setattr(genlayer, legacy_name.rsplit(".", 1)[1], module)
        real_inject_message(vm)

    def allocate_contract_with_current_sdk(contract_cls, vm, *args, **kwargs):
        from genlayer.py.storage._internal.core import ROOT_SLOT_ID
        from genlayer.py.storage._internal.generate import ORIGINAL_INIT_ATTR, _storage_build

        type_description = _storage_build(contract_cls, {})
        slot = vm._storage.get_store_slot(ROOT_SLOT_ID)
        instance = type_description.get(slot, 0)
        initializer_owner = getattr(type_description, "cls", None)
        initializer = getattr(initializer_owner or contract_cls, "__init__", None)
        if initializer is not None:
            initializer = getattr(initializer, ORIGINAL_INIT_ATTR, initializer)
            initializer(instance, *args, **kwargs)
        return instance

    def refresh_message_with_current_sdk(self):
        real_refresh_message(self)
        gl_module = sys.modules.get("genlayer.gl")
        raw_module = sys.modules.get("genlayer._internal.msg")
        if gl_module is None or raw_module is None:
            return

        from genlayer.py.types import Address, u256

        def as_address(value):
            if isinstance(value, Address):
                return value
            if isinstance(value, bytes):
                return Address(value)
            if hasattr(value, "as_bytes"):
                return Address(value.as_bytes)
            return value

        raw = raw_module.message_raw
        contract_address = as_address(self._contract_address)
        sender_address = as_address(self.sender)
        origin_address = as_address(self.origin)
        raw.update(
            contract_address=contract_address,
            sender_address=sender_address,
            origin_address=origin_address,
            value=u256(self._value),
            chain_id=u256(self._chain_id),
        )
        gl_module.message = gl_module.MessageType(
            contract_address=contract_address,
            sender_address=sender_address,
            origin_address=origin_address,
            value=u256(self._value),
            chain_id=u256(self._chain_id),
        )

    direct_loader._inject_message_to_fd0 = inject_message_with_sdk_aliases
    direct_loader._allocate_contract = allocate_contract_with_current_sdk
    direct_vm_module.VMContext._refresh_gl_message = refresh_message_with_current_sdk

    result = pytest.main(sys.argv[1:] or ["tests/python/test_direct_contract.py"])
finally:
    if "direct_loader" in locals():
        direct_loader._inject_message_to_fd0 = real_inject_message
        direct_loader._allocate_contract = real_allocate_contract
    if "direct_vm_module" in locals():
        direct_vm_module.VMContext._refresh_gl_message = real_refresh_message
    os.unlink = real_unlink

for path in locked_paths:
    try:
        real_unlink(path)
    except FileNotFoundError:
        pass
    except PermissionError:
        print(f"Could not clean temporary Direct Mode file: {path}", file=sys.stderr)

raise SystemExit(result)
