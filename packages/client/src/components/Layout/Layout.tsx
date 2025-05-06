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
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CustomConnectButton from "../CustomConnectButton";
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";

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
                >
                  {t("navigation.mcp")}
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
        <Container maxW="container.xl" textAlign="center">
          <Text color="gray.500">
            {t("common.footer", { year: new Date().getFullYear() })}
          </Text>
        </Container>
      </Box>
    </Flex>
  );
};

export default Layout;
