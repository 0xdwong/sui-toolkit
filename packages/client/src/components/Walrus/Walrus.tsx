import React, { useState } from 'react';
import {
  Container,
  Heading,
  Tabs,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useCurrentWallet, useCurrentAccount } from '@mysten/dapp-kit';
import { toaster } from "../ui/toaster";

import FileUpload from './FileUpload';
import MyFiles from './MyFiles';
import FileQuery from './FileQuery';
import FilePreview from './FilePreview';

// 定义文件类型接口
export interface WalrusFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  objectId: string;
  url?: string;
}

const WalrusStorage: React.FC = () => {
  const { t } = useTranslation();
  const { isConnected } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const [previewFile, setPreviewFile] = useState<WalrusFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // 检查钱包连接
  const checkWalletConnection = () => {
    if (!isConnected || !currentAccount) {
      toaster.create({
        title: t('walrus.messages.connectWallet'),
        type: 'error',
        duration: 3000,
      });
      return false;
    }
    return true;
  };

  // 打开文件预览
  const handleOpenPreview = (file: WalrusFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  // 关闭文件预览
  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };
  
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" mb={6}>{t('walrus.title')}</Heading>
      
      <Tabs.Root variant="enclosed" colorPalette="blue" lazyMount>
        <Tabs.List>
          <Tabs.Trigger value="upload">{t('walrus.tabs.upload')}</Tabs.Trigger>
          <Tabs.Trigger value="myFiles">{t('walrus.tabs.myFiles')}</Tabs.Trigger>
          <Tabs.Trigger value="query">{t('walrus.tabs.query')}</Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="upload">
          <FileUpload checkWalletConnection={checkWalletConnection} />
        </Tabs.Content>
        <Tabs.Content value="myFiles">
          <MyFiles 
            checkWalletConnection={checkWalletConnection} 
            onOpenPreview={handleOpenPreview}
          />
        </Tabs.Content>
        <Tabs.Content value="query">
          <FileQuery onOpenPreview={handleOpenPreview} />
        </Tabs.Content>
      </Tabs.Root>

      {previewOpen && previewFile && (
        <FilePreview
          file={previewFile}
          onClose={handleClosePreview}
        />
      )}
    </Container>
  );
};

export default WalrusStorage; 