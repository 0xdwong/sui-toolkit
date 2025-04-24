import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import config from './config';

type ChainNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet'
type NetworkConfig = typeof config;
type NetworkKey = keyof NetworkConfig;

/**
 * Gets a specific message from the memo board by ID
 * @param messageId The ID of the message to retrieve
 * @param network The network to connect to
 * @returns The message content, author address, and creation timestamp
 */
async function getMessage(messageId: bigint, network: ChainNetwork = 'mainnet') {
  // Convert network to uppercase as a valid config key
  const networkKey = network.toUpperCase() as NetworkKey;
  const MEMO_PACKAGE_ID = config[networkKey].MEMO_PACKAGE_ID;
  const MEMO_BOARD_OBJECT_ID = config[networkKey].MEMO_BOARD_OBJECT_ID;
  if (!MEMO_PACKAGE_ID || !MEMO_BOARD_OBJECT_ID) {
    throw new Error('Memo package ID or board object ID is not set');
  }

  try {
    // Create a transaction block to call the get_message function
    const tx = new Transaction();
    tx.moveCall({
      target: `${MEMO_PACKAGE_ID}::memo::get_message`,
      arguments: [
        tx.object(MEMO_BOARD_OBJECT_ID),
        tx.pure.u64(messageId)
      ],
    });

    // Execute the transaction in readonly mode to get the result
    const client = new SuiClient({ url: getFullnodeUrl(network) });
    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000'
    });

    // Parse the result
    if (result.results && result.results[0]?.returnValues) {
      // The function returns a tuple (String, address, u64)
      const [contentBytes, authorBytes, timestampBytes] = result.results[0].returnValues;
      
      // Parse content (String)
      const content = new TextDecoder().decode(new Uint8Array(contentBytes[0]));
      
      // Parse author (address)
      const author = '0x' + Buffer.from(authorBytes[0]).toString('hex');
      
      // Parse timestamp (u64)
      const timestamp = bcs.U64.parse(new Uint8Array(timestampBytes[0]));
      
      return {
        content,
        author,
        createdAt: timestamp
      };
    }
    
    throw new Error('Failed to parse message data');
  } catch (error) {
    console.error('Failed to get message:', error);
    throw error;
  }
}

async function main() {
  const network = process.argv[2] || 'mainnet';
  const messageId = BigInt(process.argv[3] || '0');
  
  if (process.argv.length <= 3) {
    console.error('Please provide a message ID');
    process.exit(1);
  }
  
  if (network !== 'mainnet' && network !== 'testnet') {
    console.error('Invalid network parameter');
    process.exit(1);
  }

  try {
    // Get the specific message
    const message = await getMessage(messageId, network as 'mainnet' | 'testnet');
    console.log(`Message #${messageId}:`);
    console.log(`Content: ${message.content.trim()}`);
    console.log(`Author: ${message.author}`);
    console.log(`Timestamp: ${new Date(Number(message.createdAt)).toLocaleString()}`);
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

// Execute main function
main();
