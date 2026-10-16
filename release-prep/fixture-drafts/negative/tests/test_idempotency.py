def test_duplicate_charge_observed_for_same_key():
    post_charge('fresh-negative-key', {'cents': 500}, {})
    post_charge('fresh-negative-key', {'cents': 500}, {})
    assert charge_count() == 2
