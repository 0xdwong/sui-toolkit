import React from 'react';
import { Box, Flex, Stack, Heading, Container, Text, Button } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import CustomConnectButton from '../CustomConnectButton';

interface LayoutProps {
  children: React.ReactNode;
}

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      fontWeight="medium"
      p={2}
      onClick={() => navigate(to)}
    >
      {children}
    </Button>
  );
};

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
                <RouterLink to="/" style={{ textDecoration: 'none' }}>
                  Sui Toolkit
                </RouterLink>
              </Heading>
              <Stack as="nav" direction="row" gap={2}>
                <NavLink to="/bulk-transfer">批量转账</NavLink>
                {/* 更多工具导航链接将在实现后添加 */}
              </Stack>
            </Stack>
            <CustomConnectButton />
          </Flex>
        </Container>
      </Flex>
      
      <Box as="main">
        {children}
      </Box>
      
      <Box as="footer" p={6} bg="white" borderTopWidth="1px" mt="auto">
        <Container maxW="container.xl" textAlign="center">
          <Text color="gray.500">
            © {new Date().getFullYear()} Sui Toolkit
          </Text>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 