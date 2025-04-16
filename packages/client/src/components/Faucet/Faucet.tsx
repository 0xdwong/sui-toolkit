import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Heading, 
  Stack,
  Text,
  VStack,
  Link,
  Textarea
} from '@chakra-ui/react';
import { getFaucetHost, requestSuiFromFaucetV1 } from '@mysten/sui/faucet';

type SuiFaucetNetwork = 'testnet' | 'devnet' | 'localnet';

interface FaucetResult {
  success: boolean;
  message: string;
  succeeded?: string[];
  failed?: string[];
}

// Simple toast implementation
const useSimpleToast = () => {
  return {
    // Simple toast implementation
    success: (options: { title: string; description: string }) => {
      console.log('Success:', options.title, options.description);
      alert(`Success: ${options.title} - ${options.description}`);
    },
    error: (options: { title: string; description: string }) => {
      console.error('Error:', options.title, options.description);
      alert(`Error: ${options.title} - ${options.description}`);
    }
  };
};

const Faucet: React.FC = () => {
  const [addresses, setAddresses] = useState<string>('');
  const [network, setNetwork] = useState<string>('devnet');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<FaucetResult | null>(null);
  const toast = useSimpleToast();

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAddresses(e.target.value);
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNetwork(e.target.value);
  };

  const getFaucetTokens = async () => {
    setIsSubmitting(true);
    setResult(null);
    
    try {
      // Parse addresses (by newlines or commas)
      const addressList = addresses
        .split(/[\n,]/)
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0);
      
      if (addressList.length === 0) {
        throw new Error('Please enter at least one valid address');
      }

      // Validate addresses format
      for (const addr of addressList) {
        if (!addr.startsWith('0x') || addr.length < 10) {
          throw new Error(`Invalid address format: ${addr}`);
        }
      }

      // Process faucet requests
      const results = await Promise.allSettled(
        addressList.map(address => 
          getFaucet(address, network as SuiFaucetNetwork)
        )
      );
      
      const succeeds = addressList.filter((_, index) => 
        results[index].status === 'fulfilled' && (results[index] as PromiseFulfilledResult<boolean>).value
      );
      
      const faileds = addressList.filter((_, index) => 
        results[index].status === 'rejected' || !(results[index] as PromiseFulfilledResult<boolean>).value
      );
      
      if (succeeds.length > 0) {
        setResult({
          success: true,
          message: `Successfully sent tokens to ${succeeds.length} address(es)`,
          succeeded: succeeds,
          failed: faileds
        });
        
        toast.success({
          title: '成功',
          description: `代币已发送到 ${succeeds.length} 个地址`
        });
      } else {
        throw new Error('No addresses were successfully funded');
      }
    } catch (error) {
      console.error('Error getting faucet tokens:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      toast.error({
        title: '错误',
        description: error instanceof Error ? error.message : '发生未知错误'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFaucet = async (address: string, network: SuiFaucetNetwork): Promise<boolean> => {
    // Request faucet
    try {
      const response = await requestSuiFromFaucetV1({
        host: getFaucetHost(network),
        recipient: address,
      });

      // Check if response has error
      if (response?.error) {
        console.error('Invalid response from faucet:', response.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('====Faucet request failed:', error);
      return false;
    }
  };

  // Generate explorer URL based on network
  const getExplorerUrl = (address: string) => {
    // const baseUrl = 'https://explorer.sui.io/address/';
    // return `${baseUrl}${address}?network=${network}`;
    return getSuiscanUrl(address);
  };

  const getSuiscanUrl = (address: string) => {
    const baseUrl = 'https://suiscan.xyz/';
    return `${baseUrl}${network}/account/${address}`;
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" mb={6}>测试网水龙头</Heading>
      
      <Stack display="flex" gap={8}>
        <Box p={5} borderWidth="1px" borderRadius="md" bg="white">
          <VStack display="flex" gap={6} align="stretch">
            <Text>
              获取测试网 SUI 代币。在下方输入您的地址以接收代币。
            </Text>
            
            <Box>
              <Text mb={2} fontWeight="bold">Network</Text>
              <select 
                value={network} 
                onChange={handleNetworkChange}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #e2e8f0' 
                }}
              >
                <option value="devnet">Devnet</option>
                <option value="testnet" disabled>Testnet (暂不可用)</option>
              </select>
            </Box>
            
            <Box>
              <Text mb={2} fontWeight="bold">Address(es)</Text>
              <Textarea
                value={addresses}
                onChange={handleAddressChange}
                placeholder="输入一个或多个地址（用逗号或换行符分隔多个地址）"
                rows={5}
              />
            </Box>

            <Button 
              colorScheme="blue" 
              size="lg" 
              onClick={getFaucetTokens}
              disabled={isSubmitting}
              width="full"
            >
              {isSubmitting ? '提交中...' : '获取代币'}
            </Button>

            {result && (
              <Box 
                p={4} 
                borderRadius="md" 
                bg={result.success ? 'green.50' : 'red.50'} 
                borderWidth="1px" 
                borderColor={result.success ? 'green.200' : 'red.200'}
              >
                <Text 
                  fontWeight="bold" 
                  fontSize="lg" 
                  color={result.success ? 'green.500' : 'red.500'} 
                  mb={2}
                >
                  {result.success ? '请求成功' : '请求失败'}
                </Text>
                <Text mb={4}>{result.message}</Text>
                
                {result.success && result.succeeded && result.succeeded.length > 0 && (
                  <VStack display="flex" gap={2} align="stretch" mt={4}>
                    <Text fontWeight="bold">成功的地址:</Text>
                    {result.succeeded.map((address, index) => (
                      <Link 
                        key={index}
                        href={getExplorerUrl(address)} 
                        color="blue.500"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        在浏览器中查看 {address.slice(0, 10)}...
                      </Link>
                    ))}
                  </VStack>
                )}
                
                {result.failed && result.failed.length > 0 && (
                  <Box mt={4}>
                    <Text fontWeight="bold" color="red.500">
                      失败的地址:
                    </Text>
                    {result.failed.map((address, index) => (
                      <Text key={index}>{address}</Text>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </VStack>
        </Box>
      </Stack>
    </Container>
  );
};

export default Faucet; 