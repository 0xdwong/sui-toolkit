import React from "react";
import {
  Box,
  Flex,
  Stack,
  Heading,
  Container,
  Text,
  Button,
  Link,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CustomConnectButton from "../CustomConnectButton";
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";
import { FaGithub, FaTwitter } from "react-icons/fa";
import { FiExternalLink } from "react-icons/fi";

interface LayoutProps {
  children: React.ReactNode;
}

const NavLink = ({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 检查当前路径是否与此链接的路径匹配
  const isActive = location.pathname === to;

  return (
    <Button
      variant="ghost"
      fontWeight="medium"
      p={2}
      onClick={() => navigate(to)}
      position="relative"
      _after={{
        content: '""',
        position: 'absolute',
        bottom: '0',
        left: '0',
        width: '100%',
        height: '2px',
        bg: isActive ? 'blue.500' : 'transparent',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      {children}
    </Button>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();

  return (
    <Flex minH="100vh" bg="gray.50" direction="column">
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
                <RouterLink to="/" style={{ textDecoration: "none" }}>
                  {t("common.appName")}
                </RouterLink>
              </Heading>
              <Stack as="nav" direction="row" gap={2}>
                <NavLink to="/bulk-transfer">
                  {t("navigation.bulkTransfer")}
                </NavLink>
                <NavLink to="/coin-manager">
                  {t("navigation.coinManager")}
                </NavLink>
                <NavLink to="/faucet">{t("navigation.faucet")}</NavLink>
                <Link
                  href="https://github.com/0xdwong/sui-mcp"
                  target="_blank"
                  rel="noopener noreferrer"
                  px={2}
                  py={1}
                  borderRadius="md"
                  _hover={{
                    textDecoration: "none",
                    bg: "gray.100",
                  }}
                  fontWeight="medium"
                  fontSize="md"
                  _focus={{ boxShadow: "outline" }}
                  display="flex"
                  alignItems="center"
                >
                  {t("navigation.mcp")}
                  <Icon as={FiExternalLink} ml={1} boxSize={3} />
                </Link>
                {/* More tool navigation links will be added after implementation */}
              </Stack>
            </Stack>
            <Stack direction="row" gap={4}>
              <LanguageSwitcher />
              <CustomConnectButton />
            </Stack>
          </Flex>
        </Container>
      </Flex>

      <Box as="main" flex="1">
        {children}
      </Box>

      <Box as="footer" p={6} bg="white" borderTopWidth="1px">
        <Container maxW="container.xl">
          <Flex direction="column" align="center" gap={3}>
            <Text color="gray.500">
              {t("common.footer", { year: new Date().getFullYear() })}
            </Text>
            <HStack gap={4}>
              <Link href="https://github.com/0xdwong/sui-toolkit" target="_blank">
                <Icon as={FaGithub} boxSize={5} color="gray.600" />
              </Link>
              <Link href="https://x.com/0xdwong" target="_blank">
                <Icon as={FaTwitter} boxSize={5} color="gray.600" />
              </Link>
            </HStack>
          </Flex>
        </Container>
      </Box>
    </Flex>
  );
};

export default Layout;
