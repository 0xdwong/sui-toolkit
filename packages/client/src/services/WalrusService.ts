import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';


// Initialize clients
export const initializeWalrusClient = (network: 'mainnet' | 'testnet' | 'devnet') => {
  const suiClient = new SuiClient({
    url: getFullnodeUrl(network),
  });

  const walrusClient = new WalrusClient({
    network: network === 'mainnet' ? 'mainnet' : 'testnet', // Walrus supports mainnet and testnet
    suiClient,
    storageNodeClientOptions: {
      timeout: 60_000,
    },
  });

  return { suiClient, walrusClient };
};



// Upload file to Walrus
export const uploadToWalrus = async ({
  file,
  signAndExecute,
  currentAccount,
  epochs = 10,
  deletable = true,
  network = 'testnet',
}: {
  file: Uint8Array;
  signAndExecute: any; // Type for the mutation function from dapp-kit
  currentAccount: { address: string };
  epochs?: number;
  deletable?: boolean;
  network?: 'mainnet' | 'testnet' | 'devnet';
}) => {
  try {
    console.log('==========uploadToWalrus==========');
    console.log({ network, 'address': currentAccount.address });
    console.log('==========uploadToWalrus==========');

    const { suiClient, walrusClient } = initializeWalrusClient(network);

    // 1. Encode the file data
    const encoded = await walrusClient.encodeBlob(file);
    console.log('Encoded blob:', encoded.blobId);

    // 2. Create transaction to register blob
    const registerBlobTransaction = await walrusClient.registerBlobTransaction({
      blobId: encoded.blobId,
      rootHash: encoded.rootHash,
      size: file.length,
      deletable,
      epochs,
      owner: currentAccount.address,
    });

    console.log('Register blob transaction created successfully');

    // 3. Sign and execute transaction

    const result = await signAndExecute(
      {
        transaction: registerBlobTransaction,
      },
      {
        onSuccess: async (tx: any) => {
          console.log('#1 Transaction signing success', tx.digest);
        },
        onError: (error: any) => {
          console.error('#1 Transaction signing error:', error);
        }
      }
    );

    console.log('Waiting for transaction completion:', result.digest);
    const { objectChanges, effects } = await suiClient.waitForTransaction({
      digest: result.digest,
      options: { showObjectChanges: true, showEffects: true },
    });

    if (effects?.status.status !== 'success') {
      console.error('Transaction effects status:', effects?.status);
      return;
    }

    // 4. Get blob type and find created object
    const blobType = await walrusClient.getBlobType();
    console.log('Blob type:', blobType);

    const blobObject = objectChanges?.find(
      (change) => change.type === 'created' && change.objectType === blobType,
    );

    if (!blobObject || blobObject.type !== 'created') {
      console.error('Blob object not found in object changes:', objectChanges);
      return;
    }

    console.log('Blob object created:', blobObject.objectId);

    // 5. Write encoded blob to nodes
    console.log('Writing encoded blob to nodes...');
    const confirmations = await walrusClient.writeEncodedBlobToNodes({
      blobId: encoded.blobId,
      metadata: encoded.metadata,
      sliversByNode: encoded.sliversByNode,
      deletable,
      objectId: blobObject.objectId,
    });

    console.log('Blob written to nodes, confirmations received');

    // 6. Create transaction to certify blob
    const certifyBlobTransaction = walrusClient.certifyBlobTransaction({
      blobId: encoded.blobId,
      blobObjectId: blobObject.objectId,
      confirmations,
      deletable,
    });

    // 7. Sign and execute certification transaction
    console.log('Certifying blob...');
    const certifyResult = await signAndExecute(
      {
        transaction: certifyBlobTransaction,
      },
      {
        onSuccess: async (certifyResult: any) => {
          console.log('#2 Certification transaction success', certifyResult.digest);
        },
        onError: (error: any) => {
          console.error('Certification transaction error:', error);
        }
      }
    );

    console.log('Waiting for certify transaction completion:', certifyResult.digest);
    const { effects: certifyEffects } = await suiClient.waitForTransaction({
      digest: certifyResult.digest,
      options: { showEffects: true },
    });

    if (certifyEffects?.status.status !== 'success') {
      console.error('Certify transaction effects status:', certifyEffects?.status);
      return;
    }

    console.log('Blob certified successfully');
    return ({ blobId: encoded.blobId, success: true });


  } catch (error) {
    console.error('Error uploading to Walrus:', error);
    return { error, success: false };
  }
};

// Read file from Walrus storage
export const readFromWalrus = async ({
  blobId,
  network = 'testnet',
}: {
  blobId: string;
  network?: 'mainnet' | 'testnet' | 'devnet';
}) => {
  try {
    const { walrusClient } = initializeWalrusClient(network);

    const blob = await walrusClient.readBlob({ blobId });
    return { blob, success: true };
  } catch (error) {
    console.error('Error reading from Walrus:', error);
    return { error, success: false };
  }
}; 