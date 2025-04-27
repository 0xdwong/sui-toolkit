import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';
import { RetryableWalrusClientError } from '@mysten/walrus';
import { type WalletAccount } from '@mysten/wallet-standard';
import { Signer, PublicKey } from '@mysten/sui/cryptography';
import { toBase64 } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions'; // Import Transaction type if needed

// 为钱包特性类型定义辅助接口
interface WalletFeature<T> {
  [key: string]: T;
}

/**
 * Walrus storage API service
 * Provides functions for interacting with Sui Walrus blob storage
 */
export const walrusAPI = {
  /**
   * Initialize a WalrusClient instance
   * @param suiClient - Sui client instance
   * @param network - Network type ('mainnet' | 'testnet' | 'devnet' | 'localnet')
   * @returns WalrusClient instance
   */
  getWalrusClient: async (suiClient: SuiClient, network?: string) => {
    try {
      // Use provided network or fallback to 'mainnet' if undefined or 'unknown'
      const networkType = (network && network !== 'unknown') 
        ? network 
        : (suiClient.network !== 'unknown' ? suiClient.network : 'mainnet');
      
      console.log('===Walrus initializing with network===', networkType);
      
      const walrusClient = new WalrusClient({
        network: networkType as "mainnet" | "testnet",
        suiClient,
        storageNodeClientOptions: {
          timeout: 60000,
          onError: (error) => console.error('Walrus API error:', error),
        },
      });
      return walrusClient;
    } catch (error) {
      console.error('Failed to initialize Walrus client:', error);
      throw error;
    }
  },

  /**
   * Create a wallet signer adapter for Walrus
   * @param walletAccount - Wallet account
   * @param network - Network type
   * @returns Signer compatible with Walrus
   */
  createWalletSigner: (walletAccount: WalletAccount, network: string): Signer => {
    // 获取钱包信息
    console.log('===创建Walrus签名器===');
    console.log('钱包地址:', walletAccount.address);
    
    // 安全地获取特性名称
    let featureNames: string[] = [];
    if (walletAccount.features) {
      if (Array.isArray(walletAccount.features)) {
        featureNames = walletAccount.features as string[];
      } else if (typeof walletAccount.features === 'object') {
        featureNames = Object.keys(walletAccount.features);
      }
    }
    console.log('可用特性列表:', featureNames);
    
    // 获取钱包实例 (可能为 null)
    const wallet = (walletAccount as any).wallet;
    // 获取特性对象 (可能是 object 或 array)
    const features = walletAccount.features;
    
    // 创建一个基本的Signer实现
    return {
      async signPersonalMessage(messageBytes: Uint8Array) {
        try {
          console.log('===尝试进行个人消息签名===');
          
          // 1. Check if features object has the method
          if (features && typeof features === 'object' && 'sui:signPersonalMessage' in features) {
            const signPersonalMessageFeature = (features as any)['sui:signPersonalMessage'];
            if (signPersonalMessageFeature && typeof signPersonalMessageFeature.signPersonalMessage === 'function') {
              console.log('===使用钱包的sui:signPersonalMessage特性 (object format)===');
              const signResult = await signPersonalMessageFeature.signPersonalMessage({
                message: messageBytes,
                account: walletAccount,
              });
              return {
                bytes: toBase64(messageBytes),
                signature: signResult.signature
              };
            }
            console.log('sui:signPersonalMessage feature object found, but signPersonalMessage function missing');
          }
          
          // 2. Check wallet instance (if available)
          if (wallet && typeof wallet.signPersonalMessage === 'function') {
            console.log('===直接使用钱包的signPersonalMessage方法===');
            const signResult = await wallet.signPersonalMessage({
              message: messageBytes,
              account: walletAccount,
            });
            return {
              bytes: toBase64(messageBytes),
              signature: signResult.signature
            };
          }
          
          // 3. Check wallet account directly
          if (typeof (walletAccount as any).signPersonalMessage === 'function') {
            console.log('===使用账户的signPersonalMessage方法===');
            const signResult = await (walletAccount as any).signPersonalMessage({
              message: messageBytes,
            });
            return {
              bytes: toBase64(messageBytes),
              signature: signResult.signature
            };
          }
          
          console.error('Wallet does not support signPersonalMessage via features object, wallet instance, or account instance.');
          throw new Error('钱包不支持个人消息签名功能');
        } catch (error) {
          console.error('个人消息签名错误:', error);
          throw error;
        }
      },
      
      async signTransaction(transactionBytes: Uint8Array) {
        try {
          console.log('===尝试进行交易签名===');
          console.log('支持的钱包特性列表:', featureNames);
          const chain = `sui:${network}`;
          console.log('使用链:', chain);
          
          // Data formats required by different signing methods
          const transactionForSignTransaction = {
            toJSON: async () => Buffer.from(transactionBytes).toString('base64'),
          };
          const transactionBlockForSignTransactionBlock = {
            toBytes: () => transactionBytes,
            // Walrus might require TransactionBlock instance, but we only have bytes here.
            // This part might need adjustment if Walrus internals change.
          };
          
          // --- Signature Method Checks --- //
          
          // Method 1: Check features object (Standard way)
          if (features && typeof features === 'object') {
            // 1a: Check for sui:signTransaction
            if ('sui:signTransaction' in features) {
              const signTransactionFeature = (features as any)['sui:signTransaction'];
              if (signTransactionFeature && typeof signTransactionFeature.signTransaction === 'function') {
                console.log('===使用钱包的sui:signTransaction特性 (object format)===');
                const signResult = await signTransactionFeature.signTransaction({
                  transaction: transactionForSignTransaction,
                  account: walletAccount,
                  chain: chain
                });
                return {
                  bytes: toBase64(transactionBytes),
                  signature: signResult.signature
                };
              }
              console.log('sui:signTransaction feature object found, but signTransaction function missing');
            }
            
            // 1b: Check for sui:signTransactionBlock
            if ('sui:signTransactionBlock' in features) {
              const signTransactionBlockFeature = (features as any)['sui:signTransactionBlock'];
              if (signTransactionBlockFeature && typeof signTransactionBlockFeature.signTransactionBlock === 'function') {
                console.log('===使用钱包的sui:signTransactionBlock特性 (object format)===');
                const signResult = await signTransactionBlockFeature.signTransactionBlock({
                  transactionBlock: transactionBlockForSignTransactionBlock,
                  account: walletAccount,
                  chain: chain
                });
                return {
                  bytes: toBase64(transactionBytes),
                  signature: signResult.signature
                };
              }
              console.log('sui:signTransactionBlock feature object found, but signTransactionBlock function missing');
            }
          } else {
            console.log('walletAccount.features is not an object, skipping direct feature object checks.');
          }
          
          // Method 2: Check wallet instance (if available)
          if (wallet) {
            console.log('===尝试使用钱包实例签名===');
            // 2a: Check for wallet.signTransaction
            if (typeof wallet.signTransaction === 'function') {
              console.log('===直接使用钱包的signTransaction方法===');
              const signResult = await wallet.signTransaction({
                transaction: transactionForSignTransaction,
                account: walletAccount,
                chain: chain
              });
              return {
                bytes: toBase64(transactionBytes),
                signature: signResult.signature
              };
            }
            // 2b: Check for wallet.signTransactionBlock
            if (typeof wallet.signTransactionBlock === 'function') {
              console.log('===直接使用钱包的signTransactionBlock方法===');
              const signResult = await wallet.signTransactionBlock({
                transactionBlock: transactionBlockForSignTransactionBlock,
                account: walletAccount,
                chain: chain
              });
              return {
                bytes: toBase64(transactionBytes),
                signature: signResult.signature
              };
            }
             console.log('Wallet instance found, but does not have signTransaction or signTransactionBlock methods.');
          } else {
            console.log('Wallet instance not available (walletAccount.wallet is null/undefined).');
          }
          
          // Method 3: Check wallet account directly (Less standard, but some wallets might attach directly)
          console.log('===尝试使用账户实例直接签名===');
          // 3a: Check for account.signTransaction
          if (typeof (walletAccount as any).signTransaction === 'function') {
            console.log('===使用账户的signTransaction方法===');
            const signResult = await (walletAccount as any).signTransaction({
              transaction: transactionForSignTransaction,
              chain: chain // Account might not need chain, depends on implementation
            });
            return {
              bytes: toBase64(transactionBytes),
              signature: signResult.signature
            };
          }
          // 3b: Check for account.signTransactionBlock
          if (typeof (walletAccount as any).signTransactionBlock === 'function') {
            console.log('===使用账户的signTransactionBlock方法===');
            const signResult = await (walletAccount as any).signTransactionBlock({
              transactionBlock: transactionBlockForSignTransactionBlock,
              chain: chain // Account might not need chain, depends on implementation
            });
            return {
              bytes: toBase64(transactionBytes),
              signature: signResult.signature
            };
          }
          console.log('Account instance does not have signTransaction or signTransactionBlock methods directly attached.');
          
          // If all attempts fail
          console.error('Exhausted all known methods to find a transaction signing function. Wallet declared features:', featureNames);
          throw new Error('钱包不支持任何有效的交易签名方法 (Wallet does not support any valid transaction signing method)');
        } catch (error) {
          console.error('交易签名过程中出错:', error);
          // Re-throw the error to be caught by the caller (uploadFile)
          throw error;
        }
      },
      
      // 基本方法
      sign: async () => { throw new Error('Not implemented'); },
      
      getPublicKey: () => {
        return {
          toSuiAddress: () => walletAccount.address,
          equals: () => false,
          flag: () => 0,
          toBase64: () => '',
          toRawBytes: () => new Uint8Array(),
          toString: () => '',
          toSuiBytes: () => new Uint8Array(),
          toSuiPublicKey: () => '',
          verify: async () => false,
          verifyAddress: () => false,
          verifyPersonalMessage: async () => false,
          verifyTransaction: async () => false,
          verifyWithIntent: async () => false,
        } as unknown as PublicKey;
      },
      
      getKeyScheme: () => { throw new Error('Not implemented'); },
      toSuiAddress: () => walletAccount.address,
      signWithIntent: async () => { throw new Error('Not implemented'); },
    } as Signer;
  },

  /**
   * Upload file to Walrus storage
   * @param file - File to upload
   * @param options - Upload options including suiClient and wallet account or signer
   * @returns Promise with the blob ID
   */
  uploadFile: async (
    file: File, 
    options: { 
      suiClient: SuiClient;
      signer: Signer | WalletAccount;
      network?: string;
    }
  ): Promise<string> => {
    if (!options.suiClient || !options.signer) {
      throw new Error('SUI Client and wallet signer are required');
    }

    try {
      // Get WalrusClient with network parameter
      const walrusClient = await walrusAPI.getWalrusClient(
        options.suiClient,
        options.network
      );

      // Convert File to Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Uint8Array(arrayBuffer);

      // Handle wallet signing
      // Check if it's a wallet account (browser extension wallet)
      if ('address' in options.signer && 'features' in options.signer) {
        // It's a WalletAccount from wallet standard
        const walletAccount = options.signer as WalletAccount;
        const networkType = options.network || 'mainnet';
        
        console.log('===创建钱包签名器===', walletAccount.address);
        console.log('使用网络:', networkType);
        
        // 检查钱包特性
        // 安全地获取特性名称
        let featureNames: string[] = [];
        if (walletAccount.features) {
          if (Array.isArray(walletAccount.features)) {
            featureNames = walletAccount.features as string[];
          } else if (typeof walletAccount.features === 'object') {
            featureNames = Object.keys(walletAccount.features);
          }
        }
        console.log('可用特性:', featureNames);
        
        // Create a signer adapter using our helper function
        const walletSigner = walrusAPI.createWalletSigner(walletAccount, networkType);
        
        // Upload using the adapted signer
        console.log('===开始上传文件===');
        const { blobId } = await walrusClient.writeBlob({
          blob,
          deletable: false,
          epochs: 3, // Store for 3 epochs
          signer: walletSigner,
        });
        
        console.log('===上传成功，Blob ID===', blobId);
        return blobId;
      } else {
        // It's a regular Signer
        console.log('===使用常规签名器===');
        const { blobId } = await walrusClient.writeBlob({
          blob,
          deletable: false,
          epochs: 3, // Store for 3 epochs
          signer: options.signer as Signer,
        });
        
        return blobId;
      }
    } catch (error) {
      console.error('上传到Walrus失败:', error);
      // Handle retryable errors
      if (error instanceof RetryableWalrusClientError) {
        // Implement retry logic here if needed
        console.log('可重试错误, 尝试重置...');
      }
      throw error;
    }
  },

  /**
   * Read a blob from Walrus storage
   * @param blobId - ID of the blob to read
   * @param network - Network type (default: 'mainnet')
   * @returns Promise with the blob data as Uint8Array
   */
  readBlob: async (blobId: string, network: string = 'mainnet'): Promise<Uint8Array> => {
    try {
      // Create a SuiClient
      const suiClient = new SuiClient({
        url: getFullnodeUrl(network as "mainnet" | "testnet" | "devnet" | "localnet")
      });

      // Get the WalrusClient
      const walrusClient = await walrusAPI.getWalrusClient(suiClient, network);

      // Read the blob
      const blob = await walrusClient.readBlob({ blobId });
      
      return blob;
    } catch (error) {
      console.error('从Walrus读取失败:', error);
      // Handle retryable errors
      if (error instanceof RetryableWalrusClientError) {
        console.log('可重试错误, 尝试重置...');
      }
      throw error;
    }
  },

  /**
   * Convert blob data to appropriate format (text, image, etc)
   * @param blob - Blob data as Uint8Array
   * @param type - MIME type of the blob
   * @returns Formatted data (string for text, object URL for binary)
   */
  formatBlobData: (blob: Uint8Array, type: string): string => {
    if (type.startsWith('text/')) {
      // Convert to text
      return new TextDecoder().decode(blob);
    } else {
      // Create object URL for binary data
      const blobObject = new Blob([blob], { type });
      return URL.createObjectURL(blobObject);
    }
  }
};

export default walrusAPI; 