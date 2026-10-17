def post_charge(key, payload, ledger):
    if key in ledger:
        old_payload, result = ledger[key]
        if payload != old_payload:
            raise IdempotencyConflict()
        return result
    result = create_charge(payload)
    ledger[key] = (payload, result)
    return result
