import React, { useState, useEffect } from "react";
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
  Link,
} from "@chakra-ui/react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { isValidSuiAddress } from "@mysten/sui/utils";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { getExplorerTxUrl } from "../../utils/explorer";
import { useWalletNetwork } from "../CustomConnectButton";

interface TransferItem {
  address: string;
  amount: string;
  isValidAddress: boolean;
}

const BulkTransfer: React.FC = () => {
  const [transferItems, setTransferItems] = useState<TransferItem[]>([
    { address: "", amount: "", isValidAddress: true },
  ]);
  const [accountBalance, setAccountBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastTxDigest, setLastTxDigest] = useState<string | null>(null);

  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const { t } = useTranslation();
  const network = useWalletNetwork();

  // Fetch account balance when currentAccount changes
  useEffect(() => {
    const fetchAccountBalance = async () => {
      if (currentAccount) {
        try {
          const balanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
          });
          setAccountBalance(BigInt(balanceResponse.totalBalance));
        } catch (error) {
          console.error("Failed to fetch balance:", error);
          toast.error(t("bulkTransfer.error.balanceFetchFailed"));
        }
      }
    };

    fetchAccountBalance();
  }, [currentAccount, suiClient, t]);

  const addNewRow = () => {
    setTransferItems([...transferItems, { address: "", amount: "", isValidAddress: true }]);
  };

  const handleChange = (
    index: number,
    field: "address" | "amount",
    value: string,
  ) => {
    const newItems = [...transferItems];

    // Ensure amount is not negative
    if (field === "amount" && value.startsWith("-")) {
      value = value.replace("-", "");
    }

    // Check if address is valid when address field changes
    if (field === "address") {
      newItems[index].isValidAddress = value === "" || isValidSuiAddress(value);
    }

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
      toast.error(t("bulkTransfer.error.connectWallet"));
      return;
    }

    // Validate input
    const validTransfers = transferItems.filter(
      (item) => item.address && item.amount && !isNaN(Number(item.amount)),
    );

    if (validTransfers.length === 0) {
      toast.error(t("bulkTransfer.error.noValidTransfers"));
      return;
    }

    // Calculate total amount needed for all transfers
    const totalAmountInMist = validTransfers.reduce((sum, item) => {
      return sum + BigInt(Math.floor(Number(item.amount) * 10 ** 9));
    }, BigInt(0));

    // Check if has enough balance
    if (totalAmountInMist > accountBalance) {
      toast.error(t("bulkTransfer.error.insufficientBalance"));
      return;
    }

    setIsLoading(true);
    setLastTxDigest(null);
    try {
      const tx = new Transaction();

      // Add all transfers to transaction
      for (const item of validTransfers) {
        // Convert amount to MIST (1 SUI = 10^9 MIST)
        const amountInMist = Math.floor(Number(item.amount) * 10 ** 9);

        // Split a portion from gas coin
        const [coin] = tx.splitCoins(tx.gas, [
          tx.pure.u64(BigInt(amountInMist)),
        ]);

        // Transfer to target address
        tx.transferObjects([coin], tx.pure.address(item.address));
      }

      // Execute transaction
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            setLastTxDigest(result.digest);
            toast.success(t("bulkTransfer.success.description", {
              digest: result.digest,
            }));
            setIsLoading(false);
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : t("bulkTransfer.error.unknownError")
            );
            setIsLoading(false);
          },
        },
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("bulkTransfer.error.unknownError")
      );
      setIsLoading(false);
    }
  };

  // Convert bigint to human-readable SUI amount
  const formatBalance = (balance: bigint): number => {
    return Number(balance) / 10 ** 9;
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" mb={6}>
        {t("bulkTransfer.title")}
      </Heading>

      <Stack display="flex" gap={8}>
        <Box p={5} borderWidth="1px" borderRadius="md" bg="white">
          <HStack justifyContent="space-between" mb={4}>
            <Heading as="h2" size="md">
              {t("bulkTransfer.transferList")}
            </Heading>
            <Button onClick={addNewRow} colorPalette="green" size="sm">
              {t("bulkTransfer.addRow")}
            </Button>
          </HStack>

          {currentAccount && (
            <Text mb={4}>
              {t("bulkTransfer.availableBalance")}: {formatBalance(accountBalance)} SUI
            </Text>
          )}

          <Box overflowX="auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    {t("bulkTransfer.receivingAddress")}
                  </th>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    {t("bulkTransfer.amount")}
                  </th>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      width: "100px",
                    }}
                  >
                    {t("bulkTransfer.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {transferItems.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: "10px" }}>
                      <Input
                        value={item.address}
                        onChange={(e) =>
                          handleChange(index, "address", e.target.value)
                        }
                        placeholder="0x..."
                        borderColor={
                          item.address && !item.isValidAddress ? "red.500" : undefined
                        }
                      />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <Input
                        value={item.amount}
                        onChange={(e) =>
                          handleChange(index, "amount", e.target.value)
                        }
                        placeholder="0.0"
                        type="number"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <Button
                        size="sm"
                        colorPalette="red"
                        onClick={() => handleRemoveRow(index)}
                      >
                        {t("bulkTransfer.delete")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          <VStack display="flex" gap={4} mt={6}>
            <Text>
              {t("bulkTransfer.total")}:{" "}
              {transferItems.reduce(
                (sum, item) => sum + (Number(item.amount) || 0),
                0,
              )}{" "}
              SUI
            </Text>
            <Button
              colorPalette="blue"
              size="lg"
              onClick={executeTransfer}
              disabled={!currentAccount || isLoading}
              width="full"
              loading={isLoading}
            >
              {t("bulkTransfer.execute")}
            </Button>

            {lastTxDigest && (
              <Box mt={4} p={4} borderWidth="1px" borderRadius="md" width="full" bg="blue.50">
                <Text fontSize="sm" mb={2}>
                  {t("bulkTransfer.transactionComplete")}
                </Text>
                <HStack>
                  <Text fontWeight="semibold" fontSize="sm" truncate>
                    {t("bulkTransfer.transactionDigest")}: {lastTxDigest.slice(0, 8)}...{lastTxDigest.slice(-6)}
                  </Text>
                  <Link
                    href={getExplorerTxUrl(lastTxDigest, network)}
                    color="blue.500"
                    target="_blank"
                    rel="noopener noreferrer"
                    ml="auto"
                  >
                    {t("bulkTransfer.viewInExplorer")}
                  </Link>
                </HStack>
              </Box>
            )}
          </VStack>
        </Box>
      </Stack>
    </Container>
  );
};

export default BulkTransfer;
