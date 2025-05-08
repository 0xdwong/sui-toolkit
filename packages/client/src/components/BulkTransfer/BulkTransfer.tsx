import React, { useState } from "react";
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
} from "@chakra-ui/react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

interface TransferItem {
  address: string;
  amount: string;
}

const BulkTransfer: React.FC = () => {
  const [transferItems, setTransferItems] = useState<TransferItem[]>([
    { address: "", amount: "" },
  ]);
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { t } = useTranslation();

  const addNewRow = () => {
    setTransferItems([...transferItems, { address: "", amount: "" }]);
  };

  const handleChange = (
    index: number,
    field: keyof TransferItem,
    value: string,
  ) => {
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
            toast.success(t("bulkTransfer.success.description", {
              digest: result.digest,
            }));
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : t("bulkTransfer.error.unknownError")
            );
          },
        },
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("bulkTransfer.error.unknownError")
      );
    }
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
                    {t("bulkTransfer.action")}
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
                        step="0.000000001"
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
              disabled={!currentAccount}
              width="full"
            >
              {t("bulkTransfer.execute")}
            </Button>
          </VStack>
        </Box>
      </Stack>
    </Container>
  );
};

export default BulkTransfer;
