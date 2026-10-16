def test_same_key_replays_without_second_charge():
    first = post_charge('fresh-corrected-r2-key', payload, ledger)
    assert post_charge('fresh-corrected-r2-key', payload, ledger) == first
    assert charge_count() == 1
