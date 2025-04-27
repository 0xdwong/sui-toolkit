import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  Image,
  Flex,
  Spinner,
  Link
} from '@chakra-ui/react';
import { toaster } from "../ui/toaster";
import { useTranslation } from 'react-i18next';
import { walrusAPI } from '../../utils/walrusAPI';

interface BlobViewerProps {
  checkWalletConnection: () => boolean;
}

const BlobViewer: React.FC<BlobViewerProps> = ({ checkWalletConnection }) => {
  const { t } = useTranslation();
  const [blobId, setBlobId] = useState<string>('');
  const [content, setContent] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('text/plain');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 处理输入更改
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBlobId(e.target.value);
  };

  // 处理内容类型更改
  const handleContentTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContentType(e.target.value);
  };

  // 查询Blob
  const handleFetchBlob = async () => {
    if (!blobId) {
      toaster.create({
        title: t('walrus.viewer.noBlobIdEntered'),
        type: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    setContent(null);

    try {
      // 从Walrus存储中读取Blob
      const blob = await walrusAPI.readBlob(blobId);
      
      // 格式化数据以供显示
      const formattedContent = walrusAPI.formatBlobData(blob, contentType);
      setContent(formattedContent);
      
      toaster.create({
        title: t('walrus.messages.fetchSuccess'),
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Fetch error:', error);
      
      toaster.create({
        title: t('walrus.messages.fetchError'),
        description: error instanceof Error ? error.message : String(error),
        type: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染内容
  const renderContent = () => {
    if (!content) return null;

    if (contentType.startsWith('image/')) {
      return <Image src={content} maxW="100%" maxH="500px" my={4} />;
    } else if (contentType.startsWith('text/')) {
      return (
        <Box 
          p={4}
          bg="gray.50"
          borderRadius="md"
          overflowX="auto"
          whiteSpace="pre-wrap"
          maxH="500px"
          overflowY="auto"
          my={4}
        >
          <Text fontFamily="monospace">{content}</Text>
        </Box>
      );
    } else if (contentType.startsWith('video/')) {
      return (
        <Box my={4}>
          <video controls src={content} style={{ maxWidth: '100%' }} />
        </Box>
      );
    } else if (contentType.startsWith('audio/')) {
      return (
        <Box my={4}>
          <audio controls src={content} style={{ width: '100%' }} />
        </Box>
      );
    } else {
      return (
        <Box my={4}>
          <Link href={content} download="downloaded-file" colorPalette="blue">
            <Button colorPalette="blue">
              {t('walrus.viewer.downloadFile')}
            </Button>
          </Link>
        </Box>
      );
    }
  };

  return (
    <VStack gap="6" align="stretch">
      <Box>
        <Text mb={2}>{t('walrus.viewer.blobIdLabel')}</Text>
        <Input
          value={blobId}
          onChange={handleInputChange}
          placeholder={t('walrus.viewer.blobIdPlaceholder')}
        />
      </Box>

      <Box>
        <Text mb={2}>{t('walrus.viewer.contentTypeLabel')}</Text>
        <Input
          value={contentType}
          onChange={handleContentTypeChange}
          placeholder="text/plain, image/jpeg, etc."
        />
      </Box>
      
      <Button
        colorPalette="blue"
        onClick={handleFetchBlob}
        disabled={!blobId || isLoading}
      >
        {isLoading 
          ? <Flex align="center"><Spinner size="sm" mr={2} />{t('walrus.viewer.loading')}</Flex> 
          : t('walrus.viewer.fetchButton')}
      </Button>
      
      {isLoading ? (
        <Flex justify="center" py={8}>
          <Spinner size="xl" />
        </Flex>
      ) : (
        renderContent()
      )}
    </VStack>
  );
};

export default BlobViewer; 