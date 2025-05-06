import React, { useState, useCallback } from 'react';
import {
  Container,
  Heading,
  Tabs,
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Code,
  Switch,
  Card,
  Field,
  Input,
  NumberInput,
  createToaster
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useWallets, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { uploadToWalrus, readFromWalrus } from '../../services/WalrusService';
const toaster = createToaster({ duration: 3000 });


const WalrusStorage: React.FC = () => {
  const { t } = useTranslation();
  const wallets = useWallets();
  const currentWallet = wallets[0];
  const connected = !!currentWallet;
  const currentAccount = currentWallet?.accounts[0];
  const { mutate: signAndExecute} = useSignAndExecuteTransaction();

  
  // 上传相关状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [blobId, setBlobId] = useState<string | null>(null);
  const [epochs, setEpochs] = useState(10);
  const [isDeletable, setIsDeletable] = useState(true);
  
  // 下载相关状态
  const [blobIdToDownload, setBlobIdToDownload] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedBlob, setDownloadedBlob] = useState<Uint8Array | null>(null);
  
  // 上传进度状态
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      // 重置之前的上传结果
      setBlobId(null);
    }
  }, []);
  
  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toaster.error({
        title: t('walrus.error.noFile'),
        duration: 3000,
      });
      return;
    }
    
    if (!connected || !currentAccount || !signAndExecute) {
      toaster.error({
        title: t('walrus.error.notConnected'),
        duration: 3000,
      });

      return;
    }
    
    setIsUploading(true);
    setUploadProgress(t('walrus.upload.progress.encoding'));
    
    try {
      // 读取文件内容
      const fileBuffer = await selectedFile.arrayBuffer();
      const fileUint8Array = new Uint8Array(fileBuffer);
      
      // 上传到Walrus，使用钱包签名者
      setUploadProgress(t('walrus.upload.progress.registering'));
      
      // 确保使用正确的signAndExecute函数
      console.log('Using signAndExecute:', signAndExecute);
      
      const result: any = await uploadToWalrus({
        file: fileUint8Array,
        signAndExecute,
        currentAccount,
        epochs,
        deletable: isDeletable,
      });
      
      if (result.success) {
        setBlobId(result.blobId || null);
        toaster.success({
          title: t('walrus.success.upload'),
          description: t('walrus.success.uploadDescription', { blobId: result.blobId || '' }),
          duration: 5000,
        });
      } else {
        toaster.error({
          title: t('walrus.error.upload'),
          description: String(result.error),
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toaster.error({
        title: t('walrus.error.upload'),
        description: String(error),
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [selectedFile, connected, currentAccount, signAndExecute, epochs, isDeletable, t]);
  
  const handleDownload = useCallback(async () => {
    if (!blobIdToDownload) {
      toaster.error({
        title: t('walrus.error.noBlobId'),
        duration: 3000,
      });
      return;
    }
    
    setIsDownloading(true);
    setDownloadedBlob(null);
    
    try {
      const result = await readFromWalrus({
        blobId: blobIdToDownload,
      });
      
      if (result.success && result.blob) {
        setDownloadedBlob(result.blob);
        
        // 创建下载链接
        const blob = new Blob([result.blob]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `walrus-blob-${blobIdToDownload.substring(0, 8)}.bin`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toaster.success({
          title: t('walrus.success.download'),
          duration: 3000,
        });
      } else {
        toaster.error({
          title: t('walrus.error.download'),
          description: String(result.error),
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error downloading blob:', error);
      toaster.error({
        title: t('walrus.error.download'),
        description: String(error),
        duration: 5000,
      });
    } finally {
      setIsDownloading(false);
    }
  }, [blobIdToDownload, t]);
  
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" mb={6}>{t('walrus.title')}</Heading>
      
      <Tabs.Root variant="enclosed" colorPalette="blue" defaultValue="upload">
        <Tabs.List>
          <Tabs.Trigger value="upload">{t('walrus.tabs.upload')}</Tabs.Trigger>
          <Tabs.Trigger value="download">{t('walrus.tabs.download')}</Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="upload" p={4}>
          <Card.Root variant="outline" my={4}>
            <Card.Body>
              <VStack gap={4} align="stretch">
                <Field.Root>
                  <Field.Label>{t('walrus.upload.selectFile')}</Field.Label>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    p={1}
                  />
                  {selectedFile && (
                    <Field.HelperText>
                      {t('walrus.upload.selectedFile')}: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                    </Field.HelperText>
                  )}
                </Field.Root>
                
                <Field.Root>
                  <Field.Label>{t('walrus.upload.epochs')}</Field.Label>
                  <NumberInput.Root
                    min={1}
                    max={100}
                    value={epochs.toString()}
                    onValueChange={(e) => setEpochs(Number(e.value))}
                  >
                    <NumberInput.Control />
                    <NumberInput.Input />
                  </NumberInput.Root>
                  <Field.HelperText>{t('walrus.upload.epochsHelp')}</Field.HelperText>
                </Field.Root>
                
                <Field.Root>
                  <HStack>
                    <Field.Label htmlFor="deletable" mb="0">
                      {t('walrus.upload.deletable')}
                    </Field.Label>
                    <Switch.Root
                      id="deletable"
                      checked={isDeletable}
                      onCheckedChange={(e) => setIsDeletable(e.checked)}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </HStack>
                </Field.Root>
                
                <Button
                  colorScheme="blue"
                  onClick={handleUpload}
                  loading={isUploading}
                  loadingText={uploadProgress || t('walrus.upload.uploading')}
                  disabled={!selectedFile || isUploading}
                >
                  {t('walrus.upload.uploadButton')}
                </Button>
                
                {isUploading && (
                  <Box>
                    <Text>{uploadProgress}</Text>
                  </Box>
                )}
                
                {blobId && (
                  <Box mt={4} p={4} borderWidth="1px" borderRadius="md" bg="green.50">
                    <Text fontWeight="bold">{t('walrus.upload.success')}</Text>
                    <Text>{t('walrus.upload.blobId')}: <Code>{blobId}</Code></Text>
                  </Box>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        </Tabs.Content>
        
        <Tabs.Content value="download" p={4}>
          <Card.Root variant="outline" my={4}>
            <Card.Body>
              <VStack gap={4} align="stretch">
                <Field.Root>
                  <Field.Label>{t('walrus.download.blobId')}</Field.Label>
                  <Input
                    value={blobIdToDownload}
                    onChange={(e) => setBlobIdToDownload(e.target.value)}
                    placeholder="0x..."
                  />
                  <Field.HelperText>{t('walrus.download.blobIdHelp')}</Field.HelperText>
                </Field.Root>
                
                <Button
                  colorScheme="blue"
                  onClick={handleDownload}
                  loading={isDownloading}
                  loadingText={t('walrus.download.downloading')}
                  disabled={!blobIdToDownload || isDownloading}
                >
                  {t('walrus.download.downloadButton')}
                </Button>
                
                {downloadedBlob && (
                  <Box mt={4} p={4} borderWidth="1px" borderRadius="md" bg="blue.50">
                    <Text fontWeight="bold">{t('walrus.download.success')}</Text>
                    <Text>{t('walrus.download.fileSize')}: {downloadedBlob.byteLength} bytes</Text>
                  </Box>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        </Tabs.Content>
      </Tabs.Root>
    </Container>
  );
};

export default WalrusStorage; 