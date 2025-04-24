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

- **Package ID**: `0x2617fa6e8a41f9932541b6e42f0fc02431ec070714cb732535c3ae218c554a80`
- **MemoBoard ID**: `0xa626aafd38578f1db622e8fa92e1e5c3b2ae8aaa364f54bfa7120a1974332509`
- **AdminCap ID**: `0xa9ad71fc21bf050eaeae2a76450b8a4dea8daf51e3572d91ed21a92f846b73f1`
- **UpgradeCap ID**: `0x0fb38c69785c7aee91d94f81f1ea8fc45561dd927d2fc099c72eed4b6cf6185b`

### 发布消息

```
sui client call --package <PACKAGE_ID> --module memo --function post_message \
  --args <MEMO_BOARD_ID> <MESSAGE_CONTENT>
```

使用 testnet 已部署合约的地址示例：

```
sui client call \
--package 0x2617fa6e8a41f9932541b6e42f0fc02431ec070714cb732535c3ae218c554a80 \
--module memo \
--function post_message \
--args \
  0xa626aafd38578f1db622e8fa92e1e5c3b2ae8aaa364f54bfa7120a1974332509 \
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
--package 0x2617fa6e8a41f9932541b6e42f0fc02431ec070714cb732535c3ae218c554a80 \
--module memo \
--function update_max_message_length \
--args \
  0xa9ad71fc21bf050eaeae2a76450b8a4dea8daf51e3572d91ed21a92f846b73f1 \
  0xa626aafd38578f1db622e8fa92e1e5c3b2ae8aaa364f54bfa7120a1974332509 \
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
