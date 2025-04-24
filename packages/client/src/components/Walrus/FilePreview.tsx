import React from 'react';
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Separator,
  Flex,
  Heading,
  HStack,
  Image,
  Portal,
  Stack,
  Text,
  useClipboard,
} from '@chakra-ui/react';
import { toaster } from "../ui/toaster";
import { useTranslation } from 'react-i18next';
import { FiDownload, FiShare2 } from 'react-icons/fi';
import { WalrusFile } from './Walrus';

interface FilePreviewProps {
  file: WalrusFile;
  onClose: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  const { t } = useTranslation();
  const shareUrl = `${window.location.origin}/walrus-storage?objectId=${file.objectId}`;
  const clipboard = useClipboard({ value: shareUrl });

  // 处理下载
  const handleDownload = () => {
    if (!file.url) return;
    
    toaster.create({
      title: t('walrus.messages.downloadStarted'),
      description: file.name,
      type: 'success',
      duration: 3000,
    });
    
    // 在实际应用中，这里会触发真正的下载
    window.open(file.url, '_blank');
  };

  // 处理分享
  const handleShare = () => {
    clipboard.copy();
    
    toaster.create({
      title: t('walrus.messages.shareSuccess'),
      type: 'success',
      duration: 3000,
    });
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

  // 渲染预览内容
  const renderPreviewContent = () => {
    // 图片预览
    if (file.type.startsWith('image/')) {
      return (
        <Flex justify="center" align="center" h="100%" maxH="500px" my={4}>
          <Image 
            src={file.url || '#'} 
            alt={file.name} 
            maxH="100%" 
            maxW="100%" 
            objectFit="contain"
          />
        </Flex>
      );
    }
    
    // PDF 预览
    if (file.type === 'application/pdf' && file.url) {
      return (
        <Box h="500px" my={4}>
          <iframe 
            src={`${file.url}#toolbar=0`}
            title={file.name}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        </Box>
      );
    }
    
    // 文本预览 (例如，如果有文本内容)
    if (file.type.startsWith('text/')) {
      return (
        <Box 
          my={4} 
          p={4} 
          bg="gray.50" 
          borderRadius="md"
          fontFamily="mono"
          overflowX="auto"
          height="350px"
        >
          <Text>文本预览内容将显示在这里...</Text>
        </Box>
      );
    }
    
    // 默认情况：不支持预览的文件类型
    return (
      <Flex 
        direction="column" 
        justify="center" 
        align="center" 
        h="300px" 
        bg="gray.50" 
        borderRadius="md"
        my={4}
      >
        <Text fontSize="lg" mb={4}>无法预览此类型的文件</Text>
        <Button 
          onClick={handleDownload}
          colorPalette="blue"
        >
          <FiDownload style={{ marginRight: '0.5rem' }} />
          {t('walrus.preview.download')}
        </Button>
      </Flex>
    );
  };

  return (
    <Dialog.Root open={true} onOpenChange={() => onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{t('walrus.preview.title')} - {file.name}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            
            <Dialog.Body>
              {/* 文件预览区域 */}
              {renderPreviewContent()}
              
              {/* 文件信息区域 */}
              <Box mt={4}>
                <Heading size="sm" mb={2}>{t('walrus.preview.fileInfo')}</Heading>
                <Separator mb={4} />
                
                <Stack gap={2}>
                  <Flex>
                    <Text fontWeight="bold" minW="120px">{t('walrus.query.filename')}:</Text>
                    <Text>{file.name}</Text>
                  </Flex>
                  
                  <Flex>
                    <Text fontWeight="bold" minW="120px">{t('walrus.query.size')}:</Text>
                    <Text>{formatFileSize(file.size)}</Text>
                  </Flex>
                  
                  <Flex>
                    <Text fontWeight="bold" minW="120px">{t('walrus.preview.fileType')}:</Text>
                    <Text>{file.type}</Text>
                  </Flex>
                  
                  <Flex>
                    <Text fontWeight="bold" minW="120px">{t('walrus.query.uploadDate')}:</Text>
                    <Text>{file.uploadDate.toLocaleString()}</Text>
                  </Flex>
                  
                  <Flex>
                    <Text fontWeight="bold" minW="120px">{t('walrus.preview.objectId')}:</Text>
                    <Text fontFamily="mono" fontSize="sm" truncate>{file.objectId}</Text>
                  </Flex>
                </Stack>
              </Box>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={4}>
                <Button onClick={handleShare}>
                  <FiShare2 style={{ marginRight: '0.5rem' }} />
                  {t('walrus.preview.share')}
                </Button>
                <Button colorPalette="blue" onClick={handleDownload}>
                  <FiDownload style={{ marginRight: '0.5rem' }} />
                  {t('walrus.preview.download')}
                </Button>
                <Dialog.ActionTrigger asChild>
                  <Button variant="ghost">
                    {t('walrus.preview.close')}
                  </Button>
                </Dialog.ActionTrigger>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default FilePreview;