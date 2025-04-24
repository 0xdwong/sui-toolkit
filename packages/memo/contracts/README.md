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

- **Package ID**: `0x247410b4f7861651cd9af1487c93b67790b4fc94bd44c85c635a976381f167ce`
- **MemoBoard ID**: `0xc98f2a6b0cbd1b64a741afc38a8c212ef55efe6c230c8e989a96e0c54caaf393`
- **AdminCap ID**: `0xb5340ab36702d74285d218698df2918a804705617aa31de7d7f1358f0264c9fc`
- **UpgradeCap ID**: `0xce1169c4cd8e2fecdba4677604b4f2ddd6b4ba60d535e73024860f2980788507`

### Publish a Message

```
sui client call --package <PACKAGE_ID> --module memo --function post_message \
  --args <MEMO_BOARD_ID> <MESSAGE_CONTENT>
```

Example using the deployed contract address on testnet:

```
sui client call \
--package 0x247410b4f7861651cd9af1487c93b67790b4fc94bd44c85c635a976381f167ce \
--module memo \
--function post_message \
--args \
  0xc98f2a6b0cbd1b64a741afc38a8c212ef55efe6c230c8e989a96e0c54caaf393 \
  "Hello World" \
  0x6
```

### Update Message Length Limit (Admin)

```
sui client call --package <PACKAGE_ID> --module memo --function update_max_message_length \
  --args <ADMIN_CAP_ID> <MEMO_BOARD_ID> <NEW_LENGTH>
```

Example using the deployed contract address on testnet:

```
sui client call \
--package 0x247410b4f7861651cd9af1487c93b67790b4fc94bd44c85c635a976381f167ce \
--module memo \
--function update_max_message_length \
--args \
  0xb5340ab36702d74285d218698df2918a804705617aa31de7d7f1358f0264c9fc \
  0xc98f2a6b0cbd1b64a741afc38a8c212ef55efe6c230c8e989a96e0c54caaf393 \
  2048
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
