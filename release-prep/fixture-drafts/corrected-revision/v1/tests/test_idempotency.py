def test_same_key_is_deduplicated():
    first = post_charge('fresh-corrected-r1-key', payload, ledger)
    assert post_charge('fresh-corrected-r1-key', payload, ledger) == first
