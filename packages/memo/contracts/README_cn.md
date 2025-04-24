# Memo - Sui 留言板

## 项目介绍

Memo 是一个基于 Sui Move 构建的链上留言板智能合约。它允许用户在链上发布消息，这些消息永久存储在 Sui 区块链上。
项目包含留言板的创建、管理和消息发布功能，并支持基本的权限控制。

## 核心功能

- **消息发布**: 任何用户都可以在留言板上发布消息
- **消息存储**: 所有消息永久存储在链上，可以通过 ID 查询
- **默认消息**: 如果提交空内容，系统会默认使用"hello"作为消息内容
- **长度限制**: 消息长度有限制，默认最大为 1024 字节
- **管理功能**: 管理员可以更新消息长度限制

## 技术实现

### 核心数据结构

1. `MemoBoard`: 共享对象，存储所有留言信息
2. `Message`: 存储单条消息的内容、作者和创建时间
3. `AdminCap`: 管理员权限对象，持有者可以管理留言板

### 主要函数

- `post_message`: 在留言板上发布新消息
- `get_message`: 通过 ID 获取特定消息
- `message_count`: 获取留言板上的消息总数
- `update_max_message_length`: 更新最大消息长度(仅限管理员)
- `get_max_message_length`: 获取当前最大消息长度限制

### 事件

- `MessagePosted`: 当用户发布新消息时触发事件

## 如何使用

### 部署合约

1. 确保安装了 Sui CLI
2. 编译合约:
   ```
   sui move build
   ```
3. 发布合约:
   ```
   sui client publish
   ```

## 已部署合约信息

以下是已部署合约的关键对象地址信息：

### testnet

- **Package ID**: `0x247410b4f7861651cd9af1487c93b67790b4fc94bd44c85c635a976381f167ce`
- **MemoBoard ID**: `0xc98f2a6b0cbd1b64a741afc38a8c212ef55efe6c230c8e989a96e0c54caaf393`
- **AdminCap ID**: `0xb5340ab36702d74285d218698df2918a804705617aa31de7d7f1358f0264c9fc`
- **UpgradeCap ID**: `0xce1169c4cd8e2fecdba4677604b4f2ddd6b4ba60d535e73024860f2980788507`

### 发布消息

```
sui client call --package <PACKAGE_ID> --module memo --function post_message \
  --args <MEMO_BOARD_ID> <MESSAGE_CONTENT>
```

使用 testnet 已部署合约的地址示例：

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

### 更新消息长度限制(管理员)

```
sui client call --package <PACKAGE_ID> --module memo --function update_max_message_length \
  --args <ADMIN_CAP_ID> <MEMO_BOARD_ID> <NEW_LENGTH>
```

使用 testnet 已部署合约的地址示例：

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

## 测试

项目包含完整的测试套件，测试了以下功能:

1. 发布消息
2. 查询消息
3. 提交空内容的默认消息处理
4. 管理员更新消息长度限制
5. 消息长度超限处理

运行测试:

```
sui move test
```

## 安全考虑

1. 使用 `AdminCap` 进行权限控制，确保只有管理员可以更改系统设置
2. 消息长度限制防止过大的消息占用过多存储空间
3. 使用 `one-time witness` 模式确保初始化安全

## 贡献

欢迎提交 Pull Requests 或提出 Issues 来改进此项目。
