import { getFullnodeUrl, SuiClient, } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import config from './config';

type ChainNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet'
type NetworkConfig = typeof config;
type NetworkKey = keyof NetworkConfig;


/**
 * Gets the total number of messages on the memo board
 * @returns The total count of messages
 */
async function getMessageCount(network: ChainNetwork = 'mainnet') {
  // Convert network to uppercase as a valid config key
  const networkKey = network.toUpperCase() as NetworkKey;
  const MEMO_PACKAGE_ID = config[networkKey].MEMO_PACKAGE_ID;
  const MEMO_BOARD_OBJECT_ID = config[networkKey].MEMO_BOARD_OBJECT_ID;
  if (!MEMO_PACKAGE_ID || !MEMO_BOARD_OBJECT_ID) {
    throw new Error('Memo package ID or board object ID is not set');
  }


  try {
    // Create a transaction block to call the message_count function
    const tx = new Transaction();
    tx.moveCall({
      target: `${MEMO_PACKAGE_ID}::memo::message_count`,
      arguments: [
        tx.object(MEMO_BOARD_OBJECT_ID)
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
      // Deserialize the BCS value (u64)
      const returnValue = result.results[0].returnValues[0][0];
      const messageCount = bcs.U64.parse(new Uint8Array(returnValue));
      return messageCount;
    }
  } catch (error) {
    console.error('Failed to get message count:', error);
  }
}

async function main() {
  const network = process.argv[2] || 'mainnet';
  if (network !== 'mainnet' && network !== 'testnet') {
    console.error('Invalid network parameter');
    process.exit(1);
  }

  try {
    // Get the total message count
    const count = await getMessageCount(network as 'mainnet' | 'testnet');
    console.log(`The memo board currently has ${count} messages`);
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

// Execute main function
main();
