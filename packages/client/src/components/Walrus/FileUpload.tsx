import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Field,
  Stack,
  Text,
  VStack
} from '@chakra-ui/react';
import { toaster } from "../ui/toaster";
import { useTranslation } from 'react-i18next';
import { useCurrentAccount } from '@mysten/dapp-kit';

// Mock API for Walrus storage interaction
// In a real app, this would be replaced with actual API calls
const walrusStorageAPI = {
  uploadFile: async (file: File, options: any): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Return mock ObjectID
    return 'sui:' + Math.random().toString(36).substring(2, 15);
  }
};

interface FileUploadProps {
  checkWalletConnection: () => boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ checkWalletConnection }) => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const [file, setFile] = useState<File | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [accessControl, setAccessControl] = useState('public');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

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

    // 文件大小检查 (例如: 限制为 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toaster.create({
        title: t('walrus.messages.fileTooLarge'),
        type: 'error',
        duration: 3000,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // 模拟上传进度
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
      // 上传文件到 Walrus 存储
      const objectId = await walrusStorageAPI.uploadFile(file, {
        encrypted: isEncrypted,
        accessControl: accessControl,
        uploader: address,
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // 显示成功消息
      toaster.create({
        title: t('walrus.messages.uploadSuccess'),
        description: `ObjectID: ${objectId}`,
        type: 'success',
        duration: 5000,
      });
      
      // 重置表单
      setFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      clearInterval(progressInterval);
      
      toaster.create({
        title: t('walrus.messages.uploadError'),
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
      
      <Field.Root>
        <Box display="flex" alignItems="center">
          <input 
            type="checkbox" 
            id="encrypt-checkbox"
            checked={isEncrypted}
            onChange={() => setIsEncrypted(!isEncrypted)}
            style={{ marginRight: '8px' }}
          />
          <label htmlFor="encrypt-checkbox">
            {t('walrus.upload.enableEncryption')}
          </label>
        </Box>
      </Field.Root>
      
      <Field.Root>
        <Field.Label>{t('walrus.upload.accessControl')}</Field.Label>
        <Stack direction="row">
          {['public', 'private', 'custom'].map((value) => (
            <Box key={value} display="flex" alignItems="center">
              <input
                type="radio"
                id={`radio-${value}`}
                name="accessControl"
                value={value}
                checked={accessControl === value}
                onChange={(e) => setAccessControl(e.target.value)}
                style={{ marginRight: '8px' }}
              />
              <label htmlFor={`radio-${value}`}>
                {t(`walrus.upload.${value}`)}
              </label>
            </Box>
          ))}
        </Stack>
      </Field.Root>
      
      <Button
        colorPalette="blue"
        onClick={handleUpload}
        disabled={!file || isUploading}
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