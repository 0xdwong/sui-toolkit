import React, { useState } from 'react';
import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  Spinner,
  Stack,
  Text,
  VStack,
  HStack
} from '@chakra-ui/react';
import { toaster } from "../ui/toaster";
import { useTranslation } from 'react-i18next';
import { FiDownload, FiEye } from 'react-icons/fi';
import { WalrusFile } from './Walrus';

// Mock API for Walrus storage interaction
const walrusStorageAPI = {
  getFileByObjectId: async (objectId: string): Promise<WalrusFile | null> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Validate object ID format
    if (!objectId.startsWith('sui:') || objectId.length < 10) {
      return null;
    }
    
    // Return mock file
    return {
      id: 'query-result',
      name: `file-${objectId.substring(4, 8)}.pdf`,
      size: Math.floor(Math.random() * 1024 * 1024 * 5), // Random size up to 5MB
      type: 'application/pdf',
      uploadDate: new Date(),
      objectId: objectId,
      url: `https://example.com/file-${objectId}`
    };
  }
};

interface FileQueryProps {
  onOpenPreview: (file: WalrusFile) => void;
}

const FileQuery: React.FC<FileQueryProps> = ({ onOpenPreview }) => {
  const { t } = useTranslation();
  const [objectId, setObjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileResult, setFileResult] = useState<WalrusFile | null>(null);

  // 处理查询
  const handleQuery = async () => {
    if (!objectId.trim()) {
      toaster.create({
        title: t('walrus.messages.invalidObjectId'),
        type: 'error',
        duration: 3000,
      });
      return;
    }
    
    setLoading(true);
    setFileResult(null);
    
    try {
      const result = await walrusStorageAPI.getFileByObjectId(objectId);
      
      if (result) {
        setFileResult(result);
        toaster.create({
          title: t('walrus.messages.querySuccess'),
          type: 'success',
          duration: 3000,
        });
      } else {
        toaster.create({
          title: t('walrus.messages.fileNotFound'),
          type: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Query error:', error);
      toaster.create({
        title: t('walrus.messages.queryError'),
        type: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // 下载文件
  const handleDownload = () => {
    if (!fileResult || !fileResult.url) return;
    
    toaster.create({
      title: t('walrus.messages.downloadStarted'),
      description: fileResult.name,
      type: 'success',
      duration: 3000,
    });
    
    // 在实际应用中，这里会触发真正的下载
    window.open(fileResult.url, '_blank');
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  // 自定义分隔线组件
  const CustomDivider = () => (
    <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid', borderColor: 'inherit', opacity: 0.6 }} />
  );

  return (
    <VStack gap={6} align="stretch">
      <Field.Root>
        <Field.Label>{t('walrus.query.title')}</Field.Label>
        <Stack direction={{ base: 'column', md: 'row' }}>
          <Input
            placeholder={t('walrus.query.placeholder')}
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            disabled={loading}
          />
          <Button
            colorPalette="blue"
            onClick={handleQuery}
            isLoading={loading}
            loadingText={t('common.loading')}
          >
            {t('walrus.query.queryButton')}
          </Button>
        </Stack>
      </Field.Root>
      
      {loading && (
        <Box textAlign="center" py={8}>
          <Spinner size="xl" />
        </Box>
      )}
      
      {fileResult && !loading && (
        <Box 
          border="1px" 
          borderColor="gray.200" 
          borderRadius="md" 
          p={6}
          bg="white"
          shadow="md"
        >
          <Heading size="md" mb={4}>{t('walrus.query.fileInfo')}</Heading>
          
          <Stack gap={4}>
            <Box>
              <Text fontWeight="bold">{t('walrus.query.filename')}</Text>
              <Text>{fileResult.name}</Text>
            </Box>
            
            <CustomDivider />
            
            <Box>
              <Text fontWeight="bold">{t('walrus.query.size')}</Text>
              <Text>{formatFileSize(fileResult.size)}</Text>
            </Box>
            
            <CustomDivider />
            
            <Box>
              <Text fontWeight="bold">{t('walrus.query.fileType')}</Text>
              <Text>{fileResult.type}</Text>
            </Box>
            
            <CustomDivider />
            
            <Box>
              <Text fontWeight="bold">{t('walrus.query.uploadDate')}</Text>
              <Text>{fileResult.uploadDate.toLocaleString()}</Text>
            </Box>
            
            <CustomDivider />
            
            <Box>
              <Text fontWeight="bold">{t('walrus.myFiles.objectId')}</Text>
              <Text fontFamily="mono">{fileResult.objectId}</Text>
            </Box>
          </Stack>
          
          <HStack gap={4} mt={6}>
            <Button
              onClick={() => onOpenPreview(fileResult)}
            >
              <FiEye style={{ marginRight: '0.5rem' }} />
              {t('walrus.query.preview')}
            </Button>
            <Button
              colorPalette="blue"
              onClick={handleDownload}
            >
              <FiDownload style={{ marginRight: '0.5rem' }} />
              {t('walrus.query.download')}
            </Button>
          </HStack>
        </Box>
      )}
    </VStack>
  );
};

export default FileQuery; 