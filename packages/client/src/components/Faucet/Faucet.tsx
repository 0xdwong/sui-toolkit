import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  VStack,
  Link,
  Textarea,
} from "@chakra-ui/react";
import { isValidSuiAddress } from "@mysten/sui/utils";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

type SuiFaucetNetwork = "testnet" | "devnet" | "localnet";

interface FaucetResult {
  success: boolean;
  message: string;
  succeeded?: string[];
  failed?: string[];
}

const Faucet: React.FC = () => {
  const [addresses, setAddresses] = useState<string>("");
  const [network, setNetwork] = useState<string>("devnet");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<FaucetResult | null>(null);
  const { t } = useTranslation();

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
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      if (addressList.length === 0) {
        throw new Error(t("faucet.error.noValidAddresses"));
      }

      // Validate addresses format
      for (const addr of addressList) {
        if (!isValidSuiAddress(addr)) {
          throw new Error(t("faucet.error.invalidAddressFormat", { address: addr }));
        }
      }

      // Process faucet requests
      const results = await Promise.allSettled(
        addressList.map((address) =>
          getFaucet(address, network as SuiFaucetNetwork),
        ),
      );

      const succeeds = addressList.filter(
        (_, index) =>
          results[index].status === "fulfilled" &&
          (results[index] as PromiseFulfilledResult<boolean>).value,
      );

      const faileds = addressList.filter(
        (_, index) =>
          results[index].status === "rejected" ||
          !(results[index] as PromiseFulfilledResult<boolean>).value,
      );

      if (succeeds.length > 0) {
        setResult({
          success: true,
          message: t("faucet.success.message", { count: succeeds.length }),
          succeeded: succeeds,
          failed: faileds,
        });

        toast.success(t("faucet.success.description", {
          count: succeeds.length,
        }));
      } else {
        throw new Error(t("faucet.error.noSuccessfulFunding"));
      }
    } catch (error) {
      console.error("Error getting faucet tokens:", error);
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : t("faucet.error.description"),
      });

      toast.error(
        error instanceof Error
          ? error.message
          : t("faucet.error.description")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFaucet = async (
    address: string,
    network: SuiFaucetNetwork,
  ): Promise<boolean> => {
    // Request faucet
    try {
      const response = await requestSuiFromFaucetV2({
        host: getFaucetHost(network),
        recipient: address,
      });

      // Check if response has error
      if (response.status !== "Success") {
        console.error("Invalid response from faucet:", response.status);
        return false;
      }
      return true;
    } catch (error) {
      console.error("====Faucet request failed:", error);
      return false;
    }
  };

  // Generate explorer URL based on network
  const getExplorerUrl = (address: string) => {
    // const baseUrl = 'https://explorer.sui.io/address/';
    // return `${baseUrl}${address}?network=${network}`;
    return getSuivisionUrl(address);
  };

  const getSuiscanUrl = (address: string) => {
    const baseUrl = "https://suiscan.xyz/";
    return `${baseUrl}${network}/account/${address}`;
  };

  const getSuivisionUrl = (address: string) => {
    return `https://${network}.suivision.xyz/account/${address}`;
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" mb={6}>
        {t("faucet.title")}
      </Heading>

      <Stack display="flex" gap={8}>
        <Box p={5} borderWidth="1px" borderRadius="md" bg="white">
          <VStack display="flex" gap={6} align="stretch">
            <Text>{t("faucet.description")}</Text>

            <Box>
              <Text mb={2} fontWeight="bold">
                {t("faucet.network")}
              </Text>
              <select
                value={network}
                onChange={handleNetworkChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <option value="devnet">{t("faucet.networks.devnet")}</option>
                <option value="testnet" disabled>
                  {t("faucet.networks.testnet")} ({t("faucet.networks.unavailable")})
                </option>
              </select>
            </Box>

            <Box>
              <Text mb={2} fontWeight="bold">
                {t("faucet.addresses")}
              </Text>
              <Textarea
                value={addresses}
                onChange={handleAddressChange}
                placeholder={t("faucet.addressPlaceholder")}
                rows={5}
              />
            </Box>

            <Button
              colorPalette="blue"
              size="lg"
              onClick={getFaucetTokens}
              disabled={isSubmitting}
              width="full"
            >
              {isSubmitting ? t("faucet.submitting") : t("faucet.getTokens")}
            </Button>

            {result && (
              <Box
                p={4}
                borderRadius="md"
                bg={result.success ? "green.50" : "red.50"}
                borderWidth="1px"
                borderColor={result.success ? "green.200" : "red.200"}
              >
                <Text
                  fontWeight="bold"
                  fontSize="lg"
                  color={result.success ? "green.500" : "red.500"}
                  mb={2}
                >
                  {result.success
                    ? t("faucet.requestSuccess")
                    : t("faucet.requestFailed")}
                </Text>
                <Text mb={4}>{result.message}</Text>

                {result.success &&
                  result.succeeded &&
                  result.succeeded.length > 0 && (
                    <VStack display="flex" gap={2} align="stretch" mt={4}>
                      <Text fontWeight="bold">
                        {t("faucet.successAddresses")}:
                      </Text>
                      {result.succeeded.map(
                        (address: string, index: number) => (
                          <Link
                            key={index}
                            href={getExplorerUrl(address)}
                            color="blue.500"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t("faucet.viewInExplorer", {
                              address: address.slice(0, 10),
                            })}
                          </Link>
                        ),
                      )}
                    </VStack>
                  )}

                {result.failed && result.failed.length > 0 && (
                  <Box mt={4}>
                    <Text fontWeight="bold" color="red.500">
                      {t("faucet.failedAddresses")}:
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
