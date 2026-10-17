def post_charge(key, payload, ledger):
    # The submitted key is ignored; each request creates another charge.
    return create_charge(payload)
