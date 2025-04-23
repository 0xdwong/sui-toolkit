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

- **Package ID**: `0x7100dee3eb86da53ec2ef84b69fa28da885b1ff508b2ad9b5b820f0454a830b7`
- **MemoBoard ID**: `0xd2dc287cb5b962578727ff2454d3bb7ebc242c7de240f3d9129f08b0cd8e271d`
- **AdminCap ID**: `0x5bad2c30775cec79e788762d0e92ce233c67e254ac9aad898a644da349d21337`
- **UpgradeCap ID**: `0x87b37d79533beae40f8f7ac4e9514a3f230f3de2065ba42e4c5a6995652787f5`

### Publish a Message

```
sui client call --package <PACKAGE_ID> --module memo --function post_message \
  --args <MEMO_BOARD_ID> <MESSAGE_CONTENT>
```

Example using the deployed contract address on testnet:

```
sui client call --package 0x7100dee3eb86da53ec2ef84b69fa28da885b1ff508b2ad9b5b820f0454a830b7 --module memo --function post_message \
  --args 0xd2dc287cb5b962578727ff2454d3bb7ebc242c7de240f3d9129f08b0cd8e271d "Hello World"
```

### Update Message Length Limit (Admin)

```
sui client call --package <PACKAGE_ID> --module memo --function update_max_message_length \
  --args <ADMIN_CAP_ID> <MEMO_BOARD_ID> <NEW_LENGTH>
```

Example using the deployed contract address on testnet:

```
sui client call --package 0x7100dee3eb86da53ec2ef84b69fa28da885b1ff508b2ad9b5b820f0454a830b7 --module memo --function update_max_message_length \
  --args 0x5bad2c30775cec79e788762d0e92ce233c67e254ac9aad898a644da349d21337 0xd2dc287cb5b962578727ff2454d3bb7ebc242c7de240f3d9129f08b0cd8e271d 2048
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
