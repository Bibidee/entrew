def post_charge(key, payload, ledger):
    if key in ledger:
        return ledger[key]
    result = create_charge(payload)
    ledger[key] = result
    return result
