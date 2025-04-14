import React from 'react';
import { Box, Flex, Stack, Heading, Link, Container, Text } from '@chakra-ui/react';
import { ConnectButton } from '@mysten/dapp-kit';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box minH="100vh" bg="gray.50">
      <Flex 
        as="header" 
        bg="white" 
        boxShadow="sm" 
        p={4}
        align="center"
        justify="space-between"
      >
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <Stack direction="row" gap={8}>
              <Heading as="h1" size="md">
                Sui Tookit
              </Heading>
              <Stack as="nav" direction="row" gap={4}>
                <Link href="/" fontWeight="medium">SUI transfer</Link>
                <Link href="#" fontWeight="medium">faucet</Link>
              </Stack>
            </Stack>
            <ConnectButton />
          </Flex>
        </Container>
      </Flex>
      
      <Box as="main">
        {children}
      </Box>
      
      <Box as="footer" p={6} bg="white" borderTopWidth="1px" mt="auto">
        <Container maxW="container.xl" textAlign="center">
          <Text color="gray.500">
            © {new Date().getFullYear()} Sui Tookit
          </Text>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 