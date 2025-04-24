#[test_only]
module memo::memo_tests;

use memo::memo::{Self, MemoBoard, AdminCap, EInvalidMessageLength};
use std::string;
use sui::test_scenario as ts;
use sui::clock::{Self};

const USER1: address = @0x1;
const USER2: address = @0x2;
const ADMIN: address = @0xAD;

#[test]
fun test_memo() {
    let mut scenario_val = ts::begin(ADMIN);
    let scenario = &mut scenario_val;

    // Initialize the memo module
    {
        memo::test_init(ts::ctx(scenario));
    };

    // Test posting a message
    ts::next_tx(scenario, USER1);
    {
        let mut board = ts::take_shared<MemoBoard>(scenario);
        let clock = clock::create_for_testing(ts::ctx(scenario));
        
        memo::post_message(&mut board, b"Hello Sui", &clock, ts::ctx(scenario));

        // Verify message count increased
        assert!(memo::message_count(&board) == 1, 0);

        // Verify message content
        let (content, author, _) = memo::get_message(&board, 0);
        assert!(string::as_bytes(&content) == &b"Hello Sui", 0);
        assert!(author == USER1, 0);

        ts::return_shared(board);
        clock::destroy_for_testing(clock);
    };

    // Test posting a second message
    ts::next_tx(scenario, USER2);
    {
        let mut board = ts::take_shared<MemoBoard>(scenario);
        let clock = clock::create_for_testing(ts::ctx(scenario));
        
        memo::post_message(&mut board, b"Second message", &clock, ts::ctx(scenario));

        // Verify message count increased
        assert!(memo::message_count(&board) == 2, 0);

        // Verify both messages
        let (content1, author1, _) = memo::get_message(&board, 0);
        let (content2, author2, _) = memo::get_message(&board, 1);

        assert!(string::as_bytes(&content1) == &b"Hello Sui", 0);
        assert!(author1 == USER1, 0);

        assert!(string::as_bytes(&content2) == &b"Second message", 0);
        assert!(author2 == USER2, 0);

        ts::return_shared(board);
        clock::destroy_for_testing(clock);
    };

    // Test posting with empty content (should use default "hello")
    ts::next_tx(scenario, USER1);
    {
        let mut board = ts::take_shared<MemoBoard>(scenario);
        let clock = clock::create_for_testing(ts::ctx(scenario));
        
        memo::post_message(&mut board, b"", &clock, ts::ctx(scenario));

        // Verify message count increased
        assert!(memo::message_count(&board) == 3, 0);

        // Verify message content is default "hello"
        let (content, author, _) = memo::get_message(&board, 2);
        assert!(string::as_bytes(&content) == &b"hello", 0);
        assert!(author == USER1, 0);

        ts::return_shared(board);
        clock::destroy_for_testing(clock);
    };

    // Test updating max message length as admin
    ts::next_tx(scenario, ADMIN);
    {
        let mut board = ts::take_shared<MemoBoard>(scenario);
        let admin_cap = ts::take_from_address<AdminCap>(scenario, ADMIN);

        // Get original max length
        let original_length = memo::get_max_message_length(&board);

        // Update max length
        let new_length = 2048;
        memo::update_max_message_length(&admin_cap, &mut board, new_length);

        // Verify max length was updated
        assert!(memo::get_max_message_length(&board) == new_length, 0);
        assert!(memo::get_max_message_length(&board) != original_length, 0);

        ts::return_to_address(ADMIN, admin_cap);
        ts::return_shared(board);
    };

    ts::end(scenario_val);
}

#[test]
#[expected_failure(abort_code = EInvalidMessageLength)]
fun test_message_too_long() {
    let mut scenario_val = ts::begin(ADMIN);
    let scenario = &mut scenario_val;

    // Initialize the memo module
    {
        memo::test_init(ts::ctx(scenario));
    };

    // Create a very long message that exceeds the default limit
    ts::next_tx(scenario, USER1);
    {
        let mut board = ts::take_shared<MemoBoard>(scenario);
        let clock = clock::create_for_testing(ts::ctx(scenario));

        // Create a message that's too long (> 1024 characters)
        let mut long_message = vector::empty<u8>();
        let mut i = 0;
        while (i < 1025) {
            vector::push_back(&mut long_message, 97); // ASCII 'a'
            i = i + 1;
        };

        // This should fail with EInvalidMessageLength
        memo::post_message(&mut board, long_message, &clock, ts::ctx(scenario));

        ts::return_shared(board);
        clock::destroy_for_testing(clock);
    };

    ts::end(scenario_val);
}
