import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Heading, 
  Input, 
  Stack,
  Text,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

interface TransferItem {
  address: string;
  amount: string;
}

// 简易的toast提示实现
const useSimpleToast = () => {
  return {
    // 简单实现toast功能
    success: (options: { title: string; description: string }) => {
      console.log('成功:', options.title, options.description);
      alert(`成功: ${options.title} - ${options.description}`);
    },
    error: (options: { title: string; description: string }) => {
      console.error('错误:', options.title, options.description);
      alert(`错误: ${options.title} - ${options.description}`);
    }
  };
};

const BulkTransfer: React.FC = () => {
  const [transferItems, setTransferItems] = useState<TransferItem[]>([
    { address: '', amount: '' }
  ]);
  const toast = useSimpleToast();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const addNewRow = () => {
    setTransferItems([...transferItems, { address: '', amount: '' }]);
  };

  const handleChange = (index: number, field: keyof TransferItem, value: string) => {
    const newItems = [...transferItems];
    newItems[index][field] = value;
    setTransferItems(newItems);
  };

  const handleRemoveRow = (index: number) => {
    if (transferItems.length > 1) {
      const newItems = [...transferItems];
      newItems.splice(index, 1);
      setTransferItems(newItems);
    }
  };

  const executeTransfer = async () => {
    if (!currentAccount) {
      toast.error({
        title: '错误',
        description: '请先连接您的钱包'
      });
      return;
    }

    // 验证输入
    const validTransfers = transferItems.filter(
      item => item.address && item.amount && !isNaN(Number(item.amount))
    );

    if (validTransfers.length === 0) {
      toast.error({
        title: '错误',
        description: '没有有效的转账信息'
      });
      return;
    }

    try {
      const tx = new Transaction();
      
      // 添加所有转账到交易中
      for (const item of validTransfers) {
        // 转换金额到 MIST (1 SUI = 10^9 MIST)
        const amountInMist = Math.floor(Number(item.amount) * 10**9);
        
        // 从gas币中分割出一部分
        const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(amountInMist))]);
        
        // 转账到目标地址
        tx.transferObjects([coin], tx.pure.address(item.address));
      }
      
      // 执行交易
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            toast.success({
              title: '转账成功',
              description: `交易摘要: ${result.digest}`
            });
          },
          onError: (error) => {
            toast.error({
              title: '转账失败',
              description: error instanceof Error ? error.message : '发生未知错误'
            });
          }
        }
      );
    } catch (error) {
      toast.error({
        title: '转账失败',
        description: error instanceof Error ? error.message : '发生未知错误'
      });
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" mb={6}>批量转账工具</Heading>
      
      <Stack display="flex" gap={8}>
        <Box p={5} borderWidth="1px" borderRadius="md" bg="white">
          <HStack justifyContent="space-between" mb={4}>
            <Heading as="h2" size="md">转账列表</Heading>
            <Button onClick={addNewRow} colorScheme="green" size="sm">添加一行</Button>
          </HStack>
          
          <Box overflowX="auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>接收地址</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>金额 (SUI)</th>
                  <th style={{ padding: '10px', textAlign: 'left', width: '100px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {transferItems.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: '10px' }}>
                      <Input
                        value={item.address}
                        onChange={(e) => handleChange(index, 'address', e.target.value)}
                        placeholder="0x..."
                      />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Input
                        value={item.amount}
                        onChange={(e) => handleChange(index, 'amount', e.target.value)}
                        placeholder="0.0"
                        type="number"
                        step="0.000000001"
                      />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Button
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleRemoveRow(index)}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          
          <VStack display="flex" gap={4} mt={6}>
            <Text>
              总计: {transferItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)} SUI
            </Text>
            <Button 
              colorScheme="blue" 
              size="lg" 
              onClick={executeTransfer}
              disabled={!currentAccount}
              width="full"
            >
              执行批量转账
            </Button>
          </VStack>
        </Box>
      </Stack>
    </Container>
  );
};

export default BulkTransfer; 