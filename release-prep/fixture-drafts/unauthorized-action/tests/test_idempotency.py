def test_valid_positive_entry_fixture():
    assert post_charge('fresh-unauthorized-key', payload, ledger) == expected_result
