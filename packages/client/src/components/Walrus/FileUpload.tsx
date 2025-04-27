import React, { useState, useCallback, ChangeEvent } from 'react';
import {
  Box,
  Button,
  VStack,
  Text
} from '@chakra-ui/react';
import { toaster } from "../ui/toaster";
import { useTranslation } from 'react-i18next';
import { 
  useCurrentAccount, 
  useSuiClient, 
  useCurrentWallet, 
  useSuiClientContext,
  useSignAndExecuteTransaction
} from '@mysten/dapp-kit';
import { walrusAPI } from '../../utils/walrusAPI';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

interface FileUploadProps {
  checkWalletConnection: () => boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ checkWalletConnection }) => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { currentWallet } = useCurrentWallet();
  const clientContext = useSuiClientContext();
  const address = currentAccount?.address;
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // 处理文件拖放
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // 上传文件
  const handleUpload = async () => {
    if (!checkWalletConnection()) return;
    if (!file) {
      toaster.create({
        title: t('walrus.upload.noFileSelected'),
        type: 'error',
        duration: 3000,
      });
      return;
    }

    // 检查钱包是否连接
    if (!currentAccount) {
      toaster.create({
        title: t('walrus.messages.noWalletConnected'),
        type: 'error',
        duration: 3000,
      });
      return;
    }

    // 文件大小检查 (例如: 限制为 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toaster.create({
        title: t('walrus.messages.fileTooLarge'),
        type: 'error',
        duration: 3000,
      });
      return;
    }

    // 诊断代码：检查钱包账户结构
    console.log('==== WALLET DIAGNOSIS ====');
    console.log('Account address:', currentAccount.address);
    console.log('Account publicKey:', currentAccount.publicKey);
    console.log('Account features:', currentAccount.features);
    
    // 检查可用的签名方法
    let availableFeatures: string[] = [];
    if (currentAccount.features) {
      if (Array.isArray(currentAccount.features)) {
        availableFeatures = currentAccount.features as string[];
      } else if (typeof currentAccount.features === 'object') {
        availableFeatures = Object.keys(currentAccount.features);
      }
    }
    console.log('Available features:', availableFeatures);
    
    // 检查具体的签名方法 (根据特性类型分别处理)
    if (Array.isArray(currentAccount.features)) {
      // 如果是字符串数组格式
      console.log('Has signPersonalMessage:', currentAccount.features.includes('sui:signPersonalMessage'));
      console.log('Has signTransaction:', currentAccount.features.includes('sui:signTransaction'));
      console.log('Has signTransactionBlock:', currentAccount.features.includes('sui:signTransactionBlock'));
    } else if (typeof currentAccount.features === 'object' && currentAccount.features) {
      // 如果是对象格式
      const featureObj = currentAccount.features as Record<string, any>;
      console.log('Has signPersonalMessage:', 'sui:signPersonalMessage' in featureObj);
      console.log('Has signTransaction:', 'sui:signTransaction' in featureObj);
      console.log('Has signTransactionBlock:', 'sui:signTransactionBlock' in featureObj);
    } else {
      console.log('Features format not recognized');
    }
    
    // 检查钱包实例
    if ((currentAccount as any).wallet) {
      console.log('Wallet instance is available');
      console.log('Wallet methods:', Object.keys((currentAccount as any).wallet || {}));
    } else {
      console.log('No direct wallet instance on the account');
    }
    console.log('==== END WALLET DIAGNOSIS ====');

    setIsUploading(true);
    setUploadProgress(0);

    // 模拟上传进度 (由于实际上传没有进度反馈)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 300);

    try {
      // Log network information for debugging
      console.log('===network===', suiClient.network);
      console.log('===wallet chains===', currentWallet?.chains);
      console.log('===current account chains===', currentAccount?.chains);
      console.log('===current network===', clientContext.network);
      
      // Detect wallet's active network
      let networkType: "mainnet" | "testnet" | "devnet" | "localnet" = "mainnet";
      
      // 网络检测优先级：
      // 1. 首先检查当前账户的链（通常这个最准确反映当前选中状态）
      if (currentAccount?.chains && currentAccount.chains.length > 0) {
        console.log('===检查账户支持的链===', currentAccount.chains);
        
        // 一些钱包只在当前活跃链上创建账户，所以currentAccount.chains[0]通常是当前使用的链
        const primaryChain = currentAccount.chains[0];
        if (primaryChain.includes('testnet')) {
          networkType = "testnet";
          console.log('===使用账户的主链(testnet)===');
        } else if (primaryChain.includes('devnet')) {
          networkType = "devnet";
          console.log('===使用账户的主链(devnet)===');
        } else if (primaryChain.includes('localnet')) {
          networkType = "localnet";
          console.log('===使用账户的主链(localnet)===');
        } else {
          console.log('===账户主链是mainnet或其他链===');
        }
      }
      
      // 2. 检查钱包支持的所有链
      // 注意：这是备选方案，因为钱包可能支持多个链但我们无法确定哪个是当前活跃的
      if (currentWallet?.chains && currentWallet.chains.length > 0) {
        console.log('===检查钱包支持的所有链===', currentWallet.chains);
        
        // 尝试获取当前活跃的链
        // 由于目前钱包API没有直接提供"当前活跃链"信息，我们使用一种启发式方法
        // 有些钱包会将当前活跃链放在chains数组的第一位
        const possiblyActiveChain = currentWallet.chains[0];
        
        // 如果我们还没有从账户中确定网络，则检查钱包的第一个链
        if (networkType === "mainnet" && possiblyActiveChain.includes('testnet')) {
          networkType = "testnet";
          console.log('===检测到钱包第一个链是testnet===');
        } else if (networkType === "mainnet" && possiblyActiveChain.includes('devnet')) {
          networkType = "devnet";
          console.log('===检测到钱包第一个链是devnet===');
        } else if (networkType === "mainnet" && possiblyActiveChain.includes('localnet')) {
          networkType = "localnet";
          console.log('===检测到钱包第一个链是localnet===');
        }
      }
      
      console.log('===最终使用的网络===', networkType);
      
      const compatibleSuiClient = new SuiClient({
        url: getFullnodeUrl(networkType)
      });
      
      // 初始化 Walrus 客户端
      console.log('===初始化Walrus客户端===');
      const walrusClient = await walrusAPI.getWalrusClient(
        compatibleSuiClient, 
        networkType
      );
      
      try {
        console.log('===准备上传文件===');
        
        // 使用 walrusAPI.uploadFile 简化上传流程，不再手动构建交易
        console.log('===使用walrusAPI.uploadFile上传===');
        const blobId = await walrusAPI.uploadFile(file, {
          suiClient: compatibleSuiClient,
          signer: currentAccount,
          network: networkType,
        });
        
        console.log('===上传成功，Blob ID===', blobId);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // 显示成功消息
        toaster.create({
          title: t('walrus.messages.uploadSuccess'),
          description: `BlobID: ${blobId}`,
          type: 'success',
          duration: 5000,
        });
        
        // 重置表单
        setFile(null);
      } catch (error) {
        console.error('Error during transaction creation/execution:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      clearInterval(progressInterval);
      
      toaster.create({
        title: t('walrus.messages.uploadError'),
        description: error instanceof Error ? error.message : String(error),
        type: 'error',
        duration: 3000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <VStack gap="6" align="stretch">
      <Box
        border="2px dashed"
        borderColor="gray.300"
        borderRadius="md"
        p={10}
        textAlign="center"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        bg={file ? "gray.50" : "white"}
        cursor="pointer"
        _hover={{ bg: "gray.50" }}
      >
        <Text mb={4}>{t('walrus.upload.dragAndDrop')}</Text>
        {file && (
          <Text fontWeight="bold">
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </Text>
        )}
      </Box>
      
      <Button as="label" colorPalette="blue">
        {t('walrus.upload.selectFile')}
        <input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </Button>
      
      <Button
        colorPalette="blue"
        onClick={handleUpload}
        disabled={!file || isUploading || !currentAccount}
      >
        {isUploading 
          ? t('walrus.upload.uploading') 
          : t('walrus.upload.uploadButton')}
      </Button>
      
      {isUploading && (
        <Box>
          <Text mb={2}>{t('walrus.upload.progress')}: {uploadProgress}%</Text>
          <Box 
            width="100%" 
            height="8px" 
            bg="gray.200" 
            borderRadius="full"
          >
            <Box 
              width={`${uploadProgress}%`} 
              height="100%" 
              bg="blue.500" 
              borderRadius="full"
            />
          </Box>
        </Box>
      )}
    </VStack>
  );
};

export default FileUpload; 