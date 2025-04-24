# Memo - Sui Message Board

## Project Introduction

Memo is an on-chain message board smart contract built on Sui Move. It allows users to publish messages that are permanently stored on the Sui blockchain.
The project includes functionality for creating and managing message boards, publishing messages, and supports basic permission control.

## Core Features

- **Message Publishing**: Any user can post messages on the message board
- **Message Storage**: All messages are permanently stored on-chain and can be queried by ID
- **Default Message**: If empty content is submitted, the system will use "hello" as the default message content
- **Length Limit**: Message length is limited, with a default maximum of 1024 bytes
- **Management Functions**: Administrators can update the message length limit

## Technical Implementation

### Core Data Structures

1. `MemoBoard`: Shared object that stores all message information
2. `Message`: Stores the content, author, and creation time of a single message
3. `AdminCap`: Administrator permission object, holders can manage the message board

### Main Functions

- `post_message`: Publish a new message on the message board
- `get_message`: Retrieve a specific message by ID
- `message_count`: Get the total number of messages on the message board
- `update_max_message_length`: Update the maximum message length (admin only)
- `get_max_message_length`: Get the current maximum message length limit

### Events

- `MessagePosted`: Event triggered when a user publishes a new message

## How to Use

### Deploy the Contract

1. Ensure the Sui CLI is installed
2. Compile the contract:
   ```
   sui move build
   ```
3. Publish the contract:
   ```
   sui client publish
   ```

## Deployed Contract Information

Below are the key object addresses for the deployed contract:

### testnet

- **Package ID**: `0x2617fa6e8a41f9932541b6e42f0fc02431ec070714cb732535c3ae218c554a80`
- **MemoBoard ID**: `0xa626aafd38578f1db622e8fa92e1e5c3b2ae8aaa364f54bfa7120a1974332509`
- **AdminCap ID**: `0xa9ad71fc21bf050eaeae2a76450b8a4dea8daf51e3572d91ed21a92f846b73f1`
- **UpgradeCap ID**: `0x0fb38c69785c7aee91d94f81f1ea8fc45561dd927d2fc099c72eed4b6cf6185b`

### Publish a Message

```
sui client call --package <PACKAGE_ID> --module memo --function post_message \
  --args <MEMO_BOARD_ID> <MESSAGE_CONTENT>
```

Example using the deployed contract address on testnet:

```
sui client call --package 0x2617fa6e8a41f9932541b6e42f0fc02431ec070714cb732535c3ae218c554a80 --module memo --function post_message \
  --args 0xa626aafd38578f1db622e8fa92e1e5c3b2ae8aaa364f54bfa7120a1974332509 "Hello World" \
  0x6
```

### Update Message Length Limit (Admin)

```
sui client call --package <PACKAGE_ID> --module memo --function update_max_message_length \
  --args <ADMIN_CAP_ID> <MEMO_BOARD_ID> <NEW_LENGTH>
```

Example using the deployed contract address on testnet:

```
sui client call --package 0x2617fa6e8a41f9932541b6e42f0fc02431ec070714cb732535c3ae218c554a80 --module memo --function update_max_message_length \
  --args 0xa9ad71fc21bf050eaeae2a76450b8a4dea8daf51e3572d91ed21a92f846b73f1 0xa626aafd38578f1db622e8fa92e1e5c3b2ae8aaa364f54bfa7120a1974332509 2048
```

## Testing

The project includes a complete test suite, testing the following functionality:

1. Publishing messages
2. Querying messages
3. Default message handling for empty content submissions
4. Administrator updates to message length limits
5. Message length limit handling

Run tests:

```
sui move test
```

## Security Considerations

1. Uses `AdminCap` for permission control, ensuring only administrators can change system settings
2. Message length limits prevent oversized messages from consuming excessive storage space
3. Uses the `one-time witness` pattern to ensure safe initialization

## Contributions

Pull Requests and Issues to improve this project are welcome.
