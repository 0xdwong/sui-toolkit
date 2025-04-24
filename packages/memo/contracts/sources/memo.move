module memo::memo;

use std::string::{Self, String};
use sui::clock::{Clock};
use sui::event;
use sui::package;
use sui::table::{Self, Table};

/// one-time witness
public struct MEMO has drop {}

/// Error codes
const EInvalidMessageLength: u64 = 1;

/// Constants
const DEFAULT_MESSAGE_LENGTH: u64 = 1024; // Default maximum message length

/// Admin capability - owner of this object can manage the memo board
public struct AdminCap has key, store {
    id: UID,
}

/// The global Memo Board that stores all messages
public struct MemoBoard has key {
    id: UID,
    messages: Table<u64, Message>,
    message_count: u64,
    max_message_length: u64,
}

/// A Message represents a single memo post
public struct Message has store {
    id: u64,
    content: String,
    author: address,
    created_at: u64,
}

/// Event emitted when a new message is posted
public struct MessagePosted has copy, drop {
    message_id: u64,
    author: address,
    content: String,
}

/// Initialize the module by creating the MemoBoard
fun init(witness: MEMO, ctx: &mut TxContext) {
    // Create admin capability using one-time witness
    let admin_cap = AdminCap {
        id: object::new(ctx),
    };

    let memo_board = MemoBoard {
        id: object::new(ctx),
        messages: table::new(ctx),
        message_count: 0,
        max_message_length: DEFAULT_MESSAGE_LENGTH,
    };

    // Transfer AdminCap to publisher
    transfer::transfer(admin_cap, tx_context::sender(ctx));

    // Share MemoBoard as a shared object
    transfer::share_object(memo_board);

    // Claim publisher
    package::claim_and_keep(witness, ctx);
}

/// Post a new message to the memo board
/// If content is empty, "hello" will be used as default content
public entry fun post_message(
    board: &mut MemoBoard,
    content: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let content_string;

    // Check if content is empty, use "hello" as default if it is
    if (vector::is_empty(&content)) {
        content_string = string::utf8(b"hello");
    } else {
        content_string = string::utf8(content);
    };

    // Check that message is not too long
    assert!(string::length(&content_string) <= board.max_message_length, EInvalidMessageLength);

    // Create new message with incremented ID
    let message_id = board.message_count;
    let message = Message {
        id: message_id,
        content: content_string,
        author: tx_context::sender(ctx),
        created_at: clock.timestamp_ms(),
    };

    // Add message to the board
    table::add(&mut board.messages, message_id, message);

    // Increment message count
    board.message_count = message_id + 1;

    // Emit event
    event::emit(MessagePosted {
        message_id,
        author: tx_context::sender(ctx),
        content: string::utf8(if (vector::is_empty(&content)) { b"hello" } else { content }),
    });
}

/// Get a specific message by ID (view function)
public fun get_message(board: &MemoBoard, message_id: u64): (String, address, u64) {
    let message = table::borrow(&board.messages, message_id);
    (message.content, message.author, message.created_at)
}

/// Get the total number of messages
public fun message_count(board: &MemoBoard): u64 {
    board.message_count
}

/// Update the maximum message length (admin only)
public entry fun update_max_message_length(
    _admin_cap: &AdminCap, // Only the owner of the AdminCap can call this function
    board: &mut MemoBoard,
    new_length: u64,
) {
    // Update the max message length
    board.max_message_length = new_length;
}

/// Get the current maximum message length
public fun get_max_message_length(board: &MemoBoard): u64 {
    board.max_message_length
}

#[test_only]
/// Test-only initialization function
public fun test_init(ctx: &mut TxContext) {
    let witness = MEMO {};
    init(witness, ctx);
}
