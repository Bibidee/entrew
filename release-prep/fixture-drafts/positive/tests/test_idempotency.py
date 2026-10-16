def test_same_key_replays_and_changed_payload_conflicts():
    ledger = {}
    first = post_charge('fresh-positive-key', {'cents': 500}, ledger)
    assert post_charge('fresh-positive-key', {'cents': 500}, ledger) == first
    with raises(IdempotencyConflict):
        post_charge('fresh-positive-key', {'cents': 900}, ledger)
    assert charge_count() == 1
