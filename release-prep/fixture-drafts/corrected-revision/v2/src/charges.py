def post_charge(key, payload, ledger):
    if key in ledger:
        saved_payload, result = ledger[key]
        if saved_payload != payload:
            raise IdempotencyConflict()
        return result
    result = create_charge(payload)
    ledger[key] = (payload, result)
    return result
