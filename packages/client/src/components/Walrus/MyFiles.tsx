import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  Text,
  Spinner,
  VStack,
  useClipboard
} from '@chakra-ui/react';
import { toaster } from "../ui/toaster";
import { useTranslation } from 'react-i18next';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { 
  FiDownload, 
  FiEye, 
  FiFileText, 
  FiImage, 
  FiRefreshCw, 
  FiSearch, 
  FiShare2, 
  FiTrash2
} from 'react-icons/fi';
import { WalrusFile } from './Walrus';

// Mock API for Walrus storage interaction
const walrusStorageAPI = {
  getUserFiles: async (address: string): Promise<WalrusFile[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock files
    return Array.from({ length: 5 }, (_, i) => ({
      id: `file-${i}`,
      name: i % 2 === 0 ? `document-${i}.pdf` : `image-${i}.png`,
      size: Math.floor(Math.random() * 1024 * 1024 * 10), // Random size up to 10MB
      type: i % 2 === 0 ? 'application/pdf' : 'image/png',
      uploadDate: new Date(Date.now() - i * 86400000), // Gradually older dates
      objectId: `sui:${Math.random().toString(36).substring(2, 15)}`,
      url: `https://example.com/file-${i}`
    }));
  },
  
  deleteFile: async (objectId: string): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    // In real implementation, this would delete the file
  }
};

interface MyFilesProps {
  checkWalletConnection: () => boolean;
  onOpenPreview: (file: WalrusFile) => void;
}

const MyFiles: React.FC<MyFilesProps> = ({ checkWalletConnection, onOpenPreview }) => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const [files, setFiles] = useState<WalrusFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('uploadDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const clipboard = useClipboard({ value: '' });

  // 加载用户文件
  const loadUserFiles = async () => {
    if (!checkWalletConnection()) return;
    
    setLoading(true);
    try {
      if (currentAccount?.address) {
        const userFiles = await walrusStorageAPI.getUserFiles(currentAccount.address);
        setFiles(userFiles);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      toaster.create({
        title: t('walrus.messages.queryError'),
        type: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时获取文件
  useEffect(() => {
    if (currentAccount?.address) {
      loadUserFiles();
    }
  }, [currentAccount?.address]);

  // 过滤和排序文件
  const filteredAndSortedFiles = () => {
    let result = [...files];
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(file => 
        file.name.toLowerCase().includes(query) || 
        file.objectId.toLowerCase().includes(query)
      );
    }
    
    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'size') {
        comparison = a.size - b.size;
      } else if (sortField === 'uploadDate') {
        comparison = a.uploadDate.getTime() - b.uploadDate.getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  };

  // 处理文件选择
  const handleSelectFile = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedFiles.length === filteredAndSortedFiles().length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredAndSortedFiles().map(file => file.id));
    }
  };

  // 下载文件
  const handleDownload = (file: WalrusFile) => {
    toaster.create({
      title: t('walrus.messages.downloadStarted'),
      description: file.name,
      type: 'success',
      duration: 3000,
    });
    
    // 在实际应用中，这里会触发真正的下载
    window.open(file.url, '_blank');
  };

  // 分享文件
  const handleShare = (file: WalrusFile) => {
    const shareUrl = `${window.location.origin}/walrus-storage?objectId=${file.objectId}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toaster.create({
        title: t('walrus.messages.shareSuccess'),
        type: 'success',
        duration: 3000,
      });
    }).catch(err => {
      console.error('Failed to copy share link:', err);
    });
  };

  // 删除文件
  const handleDelete = async (file: WalrusFile) => {
    if (!checkWalletConnection()) return;
    
    try {
      await walrusStorageAPI.deleteFile(file.objectId);
      // 更新本地文件列表
      setFiles(prev => prev.filter(f => f.id !== file.id));
      // 更新选中的文件列表
      setSelectedFiles(prev => prev.filter(id => id !== file.id));
      
      toaster.create({
        title: t('walrus.messages.deleteSuccess'),
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      toaster.create({
        title: t('walrus.messages.deleteError'),
        type: 'error',
        duration: 3000,
      });
    }
  };

  // 批量操作选中的文件
  const handleBulkAction = async (action: 'download' | 'delete') => {
    if (!checkWalletConnection()) return;
    if (selectedFiles.length === 0) return;
    
    if (action === 'download') {
      selectedFiles.forEach(fileId => {
        const file = files.find(f => f.id === fileId);
        if (file && file.url) {
          window.open(file.url, '_blank');
        }
      });
      
      toaster.create({
        title: t('walrus.messages.downloadStarted'),
        description: `${selectedFiles.length} files`,
        type: 'success',
        duration: 3000,
      });
    } else if (action === 'delete') {
      try {
        // 在实际应用中，这可能需要批量操作API
        await Promise.all(selectedFiles.map(fileId => {
          const file = files.find(f => f.id === fileId);
          if (file) {
            return walrusStorageAPI.deleteFile(file.objectId);
          }
          return Promise.resolve();
        }));
        
        // 更新本地文件列表
        setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
        // 清空选中列表
        setSelectedFiles([]);
        
        toaster.create({
          title: t('walrus.messages.deleteSuccess'),
          type: 'success',
          duration: 3000,
        });
      } catch (error) {
        console.error('Failed to delete files:', error);
        toaster.create({
          title: t('walrus.messages.deleteError'),
          type: 'error',
          duration: 3000,
        });
      }
    }
  };

  // 获取文件类型图标
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return FiImage;
    }
    return FiFileText;
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

  // 格式化日期
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const day = 24 * 60 * 60 * 1000;
    
    if (diff < day) {
      return t('common.today');
    } else if (diff < 2 * day) {
      return t('common.yesterday');
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <VStack align="stretch" gap={4}>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Button 
          onClick={loadUserFiles}
          loading={loading}
        >
          <Box as={FiRefreshCw} mr={2} />
          {t('walrus.myFiles.refresh')}
        </Button>
        
        <HStack gap={3}>
          <Box width="150px">
            <select 
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px',
                border: '1px solid #e2e8f0'
              }}
            >
              <option value="name-asc">{t('walrus.myFiles.filename')} ↑</option>
              <option value="name-desc">{t('walrus.myFiles.filename')} ↓</option>
              <option value="size-asc">{t('walrus.myFiles.size')} ↑</option>
              <option value="size-desc">{t('walrus.myFiles.size')} ↓</option>
              <option value="uploadDate-asc">{t('walrus.myFiles.uploadDate')} ↑</option>
              <option value="uploadDate-desc">{t('walrus.myFiles.uploadDate')} ↓</option>
            </select>
          </Box>
          
          <InputGroup maxW="200px">
            <Input
              placeholder={t('walrus.myFiles.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </HStack>
      </Flex>
      
      {loading ? (
        <Flex justifyContent="center" py={8}>
          <Spinner size="xl" />
          <Text ml={4}>{t('walrus.myFiles.loadingFiles')}</Text>
        </Flex>
      ) : filteredAndSortedFiles().length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text fontSize="xl">{t('walrus.myFiles.noFiles')}</Text>
        </Box>
      ) : (
        <>
          <Box overflowX="auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedFiles.length === filteredAndSortedFiles().length && filteredAndSortedFiles().length > 0}
                    />
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '50px' }}></th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>{t('walrus.myFiles.filename')}</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>{t('walrus.myFiles.size')}</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>{t('walrus.myFiles.uploadDate')}</th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '150px' }}>{t('walrus.myFiles.objectId')}</th>
                  <th style={{ padding: '12px', textAlign: 'left', width: '150px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedFiles().map(file => (
                  <tr key={file.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="checkbox"
                        onChange={() => handleSelectFile(file.id)}
                        checked={selectedFiles.includes(file.id)}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Icon as={getFileIcon(file.type)} boxSize={6} />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Text
                        cursor="pointer"
                        _hover={{ textDecoration: 'underline' }}
                        onClick={() => onOpenPreview(file)}
                        maxLines={1}
                      >
                        {file.name}
                      </Text>
                    </td>
                    <td style={{ padding: '12px' }}>{formatFileSize(file.size)}</td>
                    <td style={{ padding: '12px' }}>{formatDate(file.uploadDate)}</td>
                    <td style={{ padding: '12px' }}>
                      <Text maxLines={1} maxW="150px" title={file.objectId}>
                        {file.objectId}
                      </Text>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <HStack gap={2}>
                        <IconButton
                          aria-label={t('walrus.myFiles.preview')}
                          onClick={() => onOpenPreview(file)}
                          size="sm"
                        >
                          <FiEye />
                        </IconButton>
                        <IconButton
                          aria-label={t('walrus.myFiles.download')}
                          onClick={() => handleDownload(file)}
                          size="sm"
                        >
                          <FiDownload />
                        </IconButton>
                        <IconButton
                          aria-label={t('walrus.myFiles.share')}
                          onClick={() => handleShare(file)}
                          size="sm"
                        >
                          <FiShare2 />
                        </IconButton>
                        <IconButton
                          aria-label={t('walrus.myFiles.delete')}
                          onClick={() => handleDelete(file)}
                          size="sm"
                          colorPalette="red"
                        >
                          <FiTrash2 />
                        </IconButton>
                      </HStack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          
          {selectedFiles.length > 0 && (
            <HStack gap={4} mt={4}>
              <Text>
                {t('walrus.myFiles.selected')}: {selectedFiles.length} {t('walrus.myFiles.files')}
              </Text>
              <Button 
                onClick={() => handleBulkAction('download')}
              >
                <Box as={FiDownload} mr={2} />
                {t('walrus.myFiles.download')}
              </Button>
              <Button 
                onClick={() => handleBulkAction('delete')}
                colorPalette="red"
              >
                <Box as={FiTrash2} mr={2} />
                {t('walrus.myFiles.delete')}
              </Button>
            </HStack>
          )}
        </>
      )}
    </VStack>
  );
};

export default MyFiles; 