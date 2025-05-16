import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Heading,
  Text,
  Box,
  Flex,
  Stack,
  Button,
  Spinner,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import {
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import toast from "react-hot-toast";
import { formatCoinType } from "./utils";
import { useWalletNetwork } from "../CustomConnectButton";
import { getPriceDirectAPI, calculateValue } from "../../utils/priceUtils";
import { USDC_COIN_TYPE, SUI_TYPE_ARG, WUSDC_COIN_TYPE, USDC_COIN_DECIMALS } from "../../utils/constants";

// Import types and subcomponents
import { CoinTypeSummary, LoadingState } from "./types";
import CoinTypesList from "./CoinTypesList";
import BurnConfirmationDialog from "./BurnConfirmationDialog";
import CoinBurnSelectionDialog from "./CoinBurnSelectionDialog";

const CoinManager: React.FC = () => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const walletNetwork = useWalletNetwork(true);

  // Unified loading state management
  const [loadingState, setLoadingState] = useState<LoadingState>({
    fetchCoins: false,
    batchMerge: false,
    batchCleanZero: false,
    batchBurn: false,
    singleOperation: false,
    fetchPrices: false
  });

  // State variables
  const [selectedCoinType, setSelectedCoinType] = useState<string | null>(null);
  const [coinTypeSummaries, setCoinTypeSummaries] = useState<CoinTypeSummary[]>([]);
  const [selectedCoins, setSelectedCoins] = useState<Set<string>>(new Set());

  // Confirmation dialog states
  const [burnConfirmation, setBurnConfirmation] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: "single" as "single" | "batch"
  });

  // New state for burn selection dialog
  const [burnSelectionDialog, setBurnSelectionDialog] = useState<{
    isOpen: boolean;
    coinType: string;
    symbol: string;
    onConfirm: (selectedCoinIds: string[]) => void;
    price: string | null;
    decimals: number;
  }>({
    isOpen: false,
    coinType: "",
    symbol: "",
    onConfirm: (selectedCoinIds: string[]) => {},
    price: null,
    decimals: 9,
  });

  // Helper for toggling coin selection
  const toggleCoinSelection = (coinId: string) => {
    const newSelection = new Set(selectedCoins);
    if (newSelection.has(coinId)) {
      newSelection.delete(coinId);
      console.log(`Removed coin ${coinId} from selection. Total selected: ${newSelection.size}`);
    } else {
      newSelection.add(coinId);
      console.log(`Added coin ${coinId} to selection. Total selected: ${newSelection.size}`);
    }
    setSelectedCoins(newSelection);
    console.log("Current selection:", Array.from(newSelection));
  };

  // Helper to toggle expansion of a coin type
  const toggleCoinTypeExpansion = (coinType: string) => {
    setCoinTypeSummaries(prevSummaries =>
      prevSummaries.map(summary =>
        summary.type === coinType
          ? { ...summary, expanded: !summary.expanded }
          : summary
      )
    );

    // Set the selected coin type
    setSelectedCoinType(prevType => prevType === coinType ? null : coinType);

    // Reset selection when changing coin type
    setSelectedCoins(new Set());
  };

  // Fetch all coins for the connected wallet
  const fetchAllCoins = useCallback(async () => {
    if (!currentAccount) return;

    try {
      setLoadingState(prev => ({ ...prev, fetchCoins: true }));

      // Get all coins for the account
      const { data: allCoins } = await suiClient.getAllCoins({
        owner: currentAccount.address,
      });

      // Group coins by type
      const coinsByType = new Map<string, any[]>();
      const coinMetadata = new Map<string, { decimals: number, symbol: string }>();

      // Fetch metadata for all coin types
      for (const coin of allCoins) {
        if (!coin.coinType) continue;

        if (!coinMetadata.has(coin.coinType)) {
          try {
            const metadata = await suiClient.getCoinMetadata({
              coinType: coin.coinType,
            });

            if (metadata) {
              let symbol = metadata.symbol || formatCoinType(coin.coinType);
              if (coin.coinType === WUSDC_COIN_TYPE) symbol = "wUSDC"
              coinMetadata.set(coin.coinType, {
                decimals: metadata.decimals,
                symbol: symbol
              });
            } else {
              // Default values if metadata not found
              coinMetadata.set(coin.coinType, {
                decimals: 9,
                symbol: formatCoinType(coin.coinType)
              });
            }
          } catch (error) {
            console.error(`Error fetching metadata for ${coin.coinType}:`, error);
            // Default values on error
            coinMetadata.set(coin.coinType, {
              decimals: 9,
              symbol: formatCoinType(coin.coinType)
            });
          }
        }
      }

      allCoins.forEach(coin => {
        if (!coin.coinType) return;

        const metadata = coinMetadata.get(coin.coinType) || { decimals: 9, symbol: formatCoinType(coin.coinType) };

        const formattedCoin = {
          id: coin.coinObjectId,
          balance: coin.balance.toString(),
          type: coin.coinType,
          decimals: metadata.decimals,
        };

        if (!coinsByType.has(coin.coinType)) {
          coinsByType.set(coin.coinType, []);
        }

        coinsByType.get(coin.coinType)?.push(formattedCoin);
      });

      // Create summaries
      const summaries: CoinTypeSummary[] = [];

      for (const [type, coins] of coinsByType.entries()) {
        const totalBalance = coins.reduce(
          (sum, coin) => sum + BigInt(coin.balance),
          BigInt(0)
        ).toString();

        const metadata = coinMetadata.get(type) || { decimals: 9, symbol: formatCoinType(type) };

        summaries.push({
          type,
          symbol: metadata.symbol,
          totalBalance,
          objectCount: coins.length,
          objects: coins,
          expanded: false,
          decimals: metadata.decimals
        });
      }

      // Sort by type (SUI first, then others alphabetically)
      summaries.sort((a, b) => {
        if (a.type === SUI_TYPE_ARG) return -1;
        if (b.type === SUI_TYPE_ARG) return 1;
        return a.type.localeCompare(b.type);
      });

      setCoinTypeSummaries(summaries);

      // Fetch prices for all coin types
      await fetchCoinPrices(summaries);

    } catch (error) {
      console.error("Error fetching coins:", error);
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.unknownError"));
    } finally {
      setLoadingState(prev => ({ ...prev, fetchCoins: false }));
    }
  }, [currentAccount, suiClient, t]);

  // Check if there's any coin type with multiple objects (can be merged)
  const hasMergeableCoins = coinTypeSummaries.some(summary => summary.objectCount > 1);

  // Check if there's any zero balance coin object
  const hasZeroBalanceCoins = coinTypeSummaries.some(summary =>
    summary.objects.some(coin => parseInt(coin.balance, 10) === 0)
  );

  // Generic transaction execution function to reduce code duplication
  const executeTransaction = async (
    tx: Transaction,
    successMessage: string,
    operationType: 'batchMerge' | 'batchCleanZero' | 'batchBurn' | 'singleOperation'
  ) => {
    try {
      setLoadingState(prev => ({ ...prev, [operationType]: true }));

      return new Promise((resolve, reject) => {
        signAndExecute(
          {
            transaction: tx,
          },
          {
            onSuccess: (result) => {
              toast.success(successMessage);
              // Add a delay before resolving to allow blockchain state to update
              setTimeout(() => {
                resolve({ success: true, result });
              }, 2000); // 2 seconds delay
            },
            onError: (error) => {
              const errorMsg = error instanceof Error ? error.message : t("coinManager.error.unknownError");
              toast.error(t("coinManager.error.operationFailed") + ": " + errorMsg);
              reject({ success: false, error });
            }
          }
        );
      });
    } catch (error) {
      console.error("Transaction error:", error);
      const errorMsg = error instanceof Error ? error.message : t("coinManager.error.unknownError");
      toast.error(t("coinManager.error.operationFailed") + ": " + errorMsg);
      throw error;
    } finally {
      setLoadingState(prev => ({ ...prev, [operationType]: false }));
    }
  };

  // Optimized batch merge function
  const handleBatchMerge = async () => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const mergeableCoinTypes = coinTypeSummaries.filter(summary => summary.objectCount > 1);
    if (mergeableCoinTypes.length === 0) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noMergeableCoins"));
      return;
    }

    try {
      setLoadingState(prev => ({ ...prev, batchMerge: true }));

      // Create a single transaction for all coin types
      const tx = new Transaction();

      // Add merge operations for each coin type
      mergeableCoinTypes.forEach(summary => {
        const coinIds = summary.objects.map(coin => coin.id);

        // Special handling for SUI coins
        if (summary.type === SUI_TYPE_ARG) {
          // Skip SUI if only 2 objects (one needed for gas)
          if (summary.objects.length <= 2) {
            return;
          }

          // Sort coins by balance and keep highest balance for gas
          const sortedCoins = [...summary.objects].sort((a, b) =>
            Number(BigInt(b.balance) - BigInt(a.balance))
          );

          const primaryCoin = sortedCoins[0].id;
          const otherCoins = sortedCoins.slice(1).map(coin => coin.id);

          if (otherCoins.length > 0) {
            tx.mergeCoins(primaryCoin, otherCoins);
          }
        } else {
          // For non-SUI coins, proceed as normal
          const primaryCoin = coinIds[0];
          const otherCoins = coinIds.slice(1);
          tx.mergeCoins(primaryCoin, otherCoins);
        }
      });

      // Execute the transaction
      await executeTransaction(
        tx,
        t("coinManager.batchMergeSuccess"),
        'batchMerge'
      );

      // Refresh coin list after transaction is complete
      fetchAllCoins();
    } catch (error) {
      console.error("Error batch merging coins:", error);
      toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
    } finally {
      setLoadingState(prev => ({ ...prev, batchMerge: false }));
    }
  };

  // Optimized batch clean zero balance coins function
  const handleBatchCleanZero = async () => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const coinTypesWithZeroBalance = coinTypeSummaries.filter(summary =>
      summary.objects.some(coin => parseInt(coin.balance, 10) === 0)
    );

    if (coinTypesWithZeroBalance.length === 0) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noZeroCoins"));
      return;
    }

    try {
      setLoadingState(prev => ({ ...prev, batchCleanZero: true }));

      // Create a single transaction for all zero-balance coins
      const tx = new Transaction();
      let totalCleanedCoins = 0;

      // Add clean operations for each coin type
      coinTypesWithZeroBalance.forEach(summary => {
        // Filter zero balance coins
        const zeroBalanceCoins = summary.objects.filter(coin =>
          parseInt(coin.balance, 10) === 0
        );

        if (zeroBalanceCoins.length === 0) return;
        totalCleanedCoins += zeroBalanceCoins.length;

        if (summary.type === SUI_TYPE_ARG) {
          // Handle SUI coins
          for (const zeroCoin of zeroBalanceCoins) {
            tx.moveCall({
              target: "0x2::sui::destroy_zero_value_coin",
              arguments: [tx.object(zeroCoin.id)],
              typeArguments: [],
            });
          }
        } else {
          // Handle other coin types
          for (const zeroCoin of zeroBalanceCoins) {
            tx.moveCall({
              target: "0x2::coin::destroy_zero",
              arguments: [tx.object(zeroCoin.id)],
              typeArguments: [summary.type],
            });
          }
        }
      });

      if (totalCleanedCoins === 0) {
        toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noZeroCoins"));
        setLoadingState(prev => ({ ...prev, batchCleanZero: false }));
        return;
      }

      // Execute transaction
      await executeTransaction(
        tx,
                  `${t("coinManager.batchCleanSuccess")}: ${totalCleanedCoins} ${t("coinManager.objects")}`,
        'batchCleanZero'
      );

      // Refresh coin list
      fetchAllCoins();

    } catch (error) {
      console.error("Error batch cleaning zero-balance coins:", error);
      toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
    } finally {
      setLoadingState(prev => ({ ...prev, batchCleanZero: false }));
    }
  };

  // Optimized clean zero balance coins for single coin type
  const handleCleanZeroCoins = async (coinType: string) => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const summary = coinTypeSummaries.find(s => s.type === coinType);
    if (!summary) return;

    try {
      setLoadingState(prev => ({ ...prev, singleOperation: true }));

      // Filter zero balance coins
      const zeroBalanceCoins = summary.objects.filter(coin =>
        parseInt(coin.balance, 10) === 0
      );

      if (zeroBalanceCoins.length === 0) {
        toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noZeroCoins"));
        setLoadingState(prev => ({ ...prev, singleOperation: false }));
        return;
      }

      // Create transaction
      const tx = new Transaction();

      if (coinType === SUI_TYPE_ARG) {
        // Handle SUI coins
        const zeroIds = zeroBalanceCoins.map(coin => coin.id);
        const nonZeroCoins = summary.objects.filter(coin =>
          parseInt(coin.balance, 10) > 0
        );

        if (nonZeroCoins.length === 0) {
          toast.error(t("coinManager.error.operationFailed") + ": Need at least one coin with balance for gas");
          setLoadingState(prev => ({ ...prev, singleOperation: false }));
          return;
        }

        for (const zeroId of zeroIds) {
          tx.moveCall({
            target: "0x2::sui::destroy_zero_value_coin",
            arguments: [tx.object(zeroId)],
            typeArguments: [],
          });
        }
      } else {
        // Handle other coin types
        for (const zeroCoin of zeroBalanceCoins) {
          tx.moveCall({
            target: "0x2::coin::destroy_zero",
            arguments: [tx.object(zeroCoin.id)],
            typeArguments: [coinType],
          });
        }
      }

      // Execute transaction
      await executeTransaction(
        tx,
        `${t("coinManager.cleanSuccess")}: ${zeroBalanceCoins.length} ${t("coinManager.objects")}`,
        'singleOperation'
      );

      // Refresh coin list
      fetchAllCoins();
    } catch (error) {
      console.error("Error preparing clean transaction:", error);
    } finally {
      setLoadingState(prev => ({ ...prev, singleOperation: false }));
    }
  };

  // Optimized merge function for single coin type
  const autoMergeCoins = async (coinType: string) => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    const summary = coinTypeSummaries.find(s => s.type === coinType);
    if (!summary) return;

    if (summary.objects.length < 2) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.notEnoughCoins"));
      return;
    }

    // Special handling for SUI coins with only 2 objects
    if (coinType === SUI_TYPE_ARG && summary.objects.length === 2) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.cannotMergeTwoSuiCoins"));
      return;
    }

    try {
      setLoadingState(prev => ({ ...prev, singleOperation: true }));

      // Auto select all coins of this type
      const coinIds = summary.objects.map(coin => coin.id);

      // For SUI coins, ensure we keep one coin separate for gas
      const tx = new Transaction();

      if (coinType === SUI_TYPE_ARG) {
        // Sort coins by balance and keep the highest balance one for potential gas payment
        const sortedCoins = [...summary.objects].sort((a, b) =>
          Number(BigInt(b.balance) - BigInt(a.balance))
        );

        const primaryCoin = sortedCoins[0].id;
        // Use all other coins except the primary one
        const otherCoins = sortedCoins.slice(1).map(coin => coin.id);

        if (otherCoins.length > 0) {
          tx.mergeCoins(primaryCoin, otherCoins);
        } else {
          toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.notEnoughCoins"));
          setLoadingState(prev => ({ ...prev, singleOperation: false }));
          return;
        }
      } else {
        // For non-SUI coins, proceed as normal
        const primaryCoin = coinIds[0];
        const otherCoins = coinIds.slice(1);
        tx.mergeCoins(primaryCoin, otherCoins);
      }

      // Execute transaction
      await executeTransaction(
        tx,
        t("coinManager.mergeSuccess"),
        'singleOperation'
      );

      // Reset selection and refresh coin list
      setSelectedCoins(new Set());
      fetchAllCoins();
    } catch (error) {
      console.error("Error preparing merge transaction:", error);
    } finally {
      setLoadingState(prev => ({ ...prev, singleOperation: false }));
    }
  };

  // Fetch prices for all coins
  const fetchCoinPrices = useCallback(async (summaries: CoinTypeSummary[]) => {
    if (!summaries.length) return;

    try {
      setLoadingState(prev => ({ ...prev, fetchPrices: true }));
      // Create a copy of summaries to update with price data
      const updatedSummaries = [...summaries];

      // Fetch price for each coin type
      for (let i = 0; i < updatedSummaries.length; i++) {
        const summary = updatedSummaries[i];

        try {
          // Skip fetching price for wUSDC itself
          if (summary.type === USDC_COIN_TYPE) {
            summary.price = "1.0";
            summary.value = Number(summary.totalBalance) / Math.pow(10, summary.decimals);
            continue;
          }

          const price = await getPriceDirectAPI(
            summary.type,
            summary.decimals,
            USDC_COIN_TYPE,
            USDC_COIN_DECIMALS
          );

          // Update the summary with price and calculated value
          summary.price = price;
          if (price) {
            summary.value = calculateValue(summary.totalBalance, price, summary.decimals);
          } else {
            summary.value = null;
          }
        } catch (error) {
          console.error(`Error fetching price for ${summary.symbol}:`, error);
          summary.price = null;
          summary.value = null;
        }
      }

      setCoinTypeSummaries(updatedSummaries);
    } catch (error) {
      console.error("Error fetching coin prices:", error);
    } finally {
      setLoadingState(prev => ({ ...prev, fetchPrices: false }));
    }
  }, [suiClient]);

  // Handle burn selected coins for a specific coin type
  const handleBurnSelectedCoins = async (coinType: string) => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    if (selectedCoins.size === 0) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noCoinsSelected"));
      console.log("No coins selected for burning. Selected coins:", selectedCoins);
      return;
    }

    // Show confirmation dialog
    setBurnConfirmation({
      isOpen: true,
      title: t("coinManager.confirmBurn"),
      message: t("coinManager.confirmBurnMessage"),
      type: "single",
      onConfirm: async () => {
        setBurnConfirmation(prev => ({ ...prev, isOpen: false }));

        try {
          setLoadingState(prev => ({ ...prev, singleOperation: true }));

          // Create transaction
          const tx = new Transaction();
          const selectedCoinsArray = Array.from(selectedCoins);

          // Transfer to zero address (0x0) for both SUI and other coins
          for (const coinId of selectedCoinsArray) {
            tx.transferObjects(
              [tx.object(coinId)],
              tx.pure.address("0x0")
            );
          }

          // Execute transaction
          await executeTransaction(
            tx,
            `${t("coinManager.burnSuccess")}: ${selectedCoinsArray.length} ${t("coinManager.objects")}`,
            'singleOperation'
          );

          // Reset selection and refresh coin list
          setSelectedCoins(new Set());
          fetchAllCoins();
        } catch (error) {
          console.error("Error burning coins:", error);
          toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
        } finally {
          setLoadingState(prev => ({ ...prev, singleOperation: false }));
        }
      }
    });
  };

  // Handle batch burn of low value coins (< $0.1)
  const handleBatchBurnLowValueCoins = async () => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    // Find coins with value < $0.1
    const lowValueCoins = new Map<string, string[]>();
    let hasNoPriceCoins = false;

    coinTypeSummaries.forEach(summary => {
      if (!summary.price) {
        hasNoPriceCoins = true;
        console.log(`No price data for coin: ${summary.symbol} (${summary.type})`);
        return;
      }

      const lowValueObjects = summary.objects.filter(coin => {
        // Calculate this coin object's value
        const value = Number(coin.balance) / Math.pow(10, summary.decimals) * Number(summary.price);
        console.log(`Coin ${summary.symbol} object: balance=${coin.balance}, value=$${value.toFixed(4)}`);
        return value < 0.1 && Number(coin.balance) > 0; // Ensure balance is not zero
      });

      if (lowValueObjects.length > 0) {
        lowValueCoins.set(summary.type, lowValueObjects.map(c => c.id));
      }
    });

    const totalCoins = Array.from(lowValueCoins.values()).flat().length;
    if (totalCoins === 0) {
      if (hasNoPriceCoins) {
        toast.error(t("coinManager.error.title") + ": " + "Some coins have no price data");
      } else {
        toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noLowValueCoins"));
      }
      console.log("Low value coins summary:", lowValueCoins);
      return;
    }

    // Show confirmation dialog
    setBurnConfirmation({
      isOpen: true,
      title: t("coinManager.confirmBatchBurn"),
      message: `${t("coinManager.confirmBatchBurnMessage")} (${totalCoins} ${t("coinManager.objects")})`,
      type: "batch",
      onConfirm: async () => {
        setBurnConfirmation(prev => ({ ...prev, isOpen: false }));

        try {
          setLoadingState(prev => ({ ...prev, batchBurn: true }));

          // Create transaction
          const tx = new Transaction();
          let burnCount = 0;

          // Add burn operations for each coin type
          for (const [, coinIds] of lowValueCoins.entries()) {
            if (coinIds.length === 0) continue;

            // Transfer all coins to zero address (0x0)
            for (const coinId of coinIds) {
              tx.transferObjects(
                [tx.object(coinId)],
                tx.pure.address("0x0")
              );
              burnCount++;
            }
          }

          if (burnCount === 0) {
            toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noLowValueCoins"));
            setLoadingState(prev => ({ ...prev, batchBurn: false }));
            return;
          }

          // Execute transaction
          await executeTransaction(
            tx,
            `${t("coinManager.batchBurnSuccess")}: ${burnCount} ${t("coinManager.objects")}`,
            'batchBurn'
          );

          // Refresh coin list
          fetchAllCoins();
        } catch (error) {
          console.error("Error batch burning coins:", error);
          toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
        } finally {
          setLoadingState(prev => ({ ...prev, batchBurn: false }));
        }
      }
    });
  };

  // Handle the burn dialog showing
  const handleShowBurnDialog = (coinType: string) => {
    const summary = coinTypeSummaries.find(s => s.type === coinType);
    if (!summary) return;

    setBurnSelectionDialog({
      isOpen: true,
      coinType: coinType,
      symbol: summary.symbol,
      price: summary.price || null,
      decimals: summary.decimals,
      onConfirm: (selectedCoinIds: string[]) => {
        handleBurnCoins(coinType, selectedCoinIds);
      }
    });
  };

  // Reset selection when dialog closes
  const handleBurnDialogClose = () => {
    setBurnSelectionDialog(prev => ({ ...prev, isOpen: false }));
    // 不要在这里重置selection，因为可能是取消操作
  };

  // Handle burning a single coin
  const handleBurnSingleCoin = async (coinId: string) => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    // Find the coin object and its type
    let foundCoinType = "";
    let foundCoin: any = null;
    let foundSummary = null;

    for (const summary of coinTypeSummaries) {
      const coin = summary.objects.find(c => c.id === coinId);
      if (coin) {
        foundCoinType = summary.type;
        foundCoin = coin;
        foundSummary = summary;
        break;
      }
    }

    if (!foundCoinType || !foundCoin || !foundSummary) {
      console.error("Coin not found:", coinId);
      return;
    }
    
    // Format balance according to decimals
    const formattedBalance = (Number(foundCoin.balance) / Math.pow(10, foundSummary.decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: foundSummary.decimals
    });

    // Show confirmation dialog
    setBurnConfirmation({
      isOpen: true,
      title: t("coinManager.confirmBurnSingle"),
      message: t("coinManager.confirmBurnSingleMessage", { 
        balance: formattedBalance, 
        symbol: foundSummary.symbol || formatCoinType(foundCoinType) 
      }),
      type: "single",
      onConfirm: async () => {
        setBurnConfirmation(prev => ({ ...prev, isOpen: false }));
        
        try {
          setLoadingState(prev => ({ ...prev, singleOperation: true }));
          
          // Create transaction
          const tx = new Transaction();
          
          // Transfer to zero address (0x0)
          tx.transferObjects(
            [tx.object(coinId)],
            tx.pure.address("0x0")
          );
          
          // Execute transaction
          await executeTransaction(
            tx,
            t("coinManager.burnSuccess") + ": 1 " + t("coinManager.object"),
            'singleOperation'
          );
          
          // Refresh coin list
          fetchAllCoins();
        } catch (error) {
          console.error("Error burning coin:", error);
          toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
        } finally {
          setLoadingState(prev => ({ ...prev, singleOperation: false }));
        }
      }
    });
  };

  // Handle burning multiple selected coins
  const handleBurnCoins = async (coinType: string, coinIds: string[]) => {
    if (!currentAccount) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.connectWallet"));
      return;
    }

    if (coinIds.length === 0) {
      toast.error(t("coinManager.error.title") + ": " + t("coinManager.error.noCoinsSelected"));
      console.log("No coins selected for burning. Selected coins:", coinIds);
      return;
    }

    setBurnSelectionDialog(prev => ({ ...prev, isOpen: false }));

    // Show confirmation dialog
    setBurnConfirmation({
      isOpen: true,
      title: t("coinManager.confirmBurn"),
      message: t("coinManager.confirmBurnMessage", { count: coinIds.length }),
      type: "single",
      onConfirm: async () => {
        setBurnConfirmation(prev => ({ ...prev, isOpen: false }));

        try {
          setLoadingState(prev => ({ ...prev, singleOperation: true }));

          // Create transaction
          const tx = new Transaction();

          // Transfer all coins to zero address (0x0)
          for (const coinId of coinIds) {
            tx.transferObjects(
              [tx.object(coinId)],
              tx.pure.address("0x0")
            );
          }

          // Execute transaction
          await executeTransaction(
            tx,
            `${t("coinManager.burnSuccess")}: ${coinIds.length} ${t("coinManager.objects")}`,
            'singleOperation'
          );

          // Reset selection and refresh coin list
          setSelectedCoins(new Set());
          fetchAllCoins();
        } catch (error) {
          console.error("Error burning coins:", error);
          toast.error(t("coinManager.error.operationFailed") + ": " + (error instanceof Error ? error.message : t("coinManager.error.unknownError")));
        } finally {
          setLoadingState(prev => ({ ...prev, singleOperation: false }));
        }
      }
    });
  };

  // Load coins when account changes or network changes
  useEffect(() => {
    if (currentAccount) {
      fetchAllCoins();
    } else {
      setCoinTypeSummaries([]);
    }
  }, [currentAccount, walletNetwork, fetchAllCoins]);

  return (
    <Container maxW="container.xl" py={8}>
      <Stack direction="column" gap={6}>
        <Box>
          <Heading as="h1" mb={2}>
            {t("coinManager.title")}
          </Heading>
          <Text color="gray.600" mb={2}>
            {t("coinManager.description")}
          </Text>
        </Box>

        <Box p={5} borderWidth="1px" borderRadius="md" bg="white">
          <Stack direction="column" gap={4}>
            {/* Coin Type Summary */}
            <Box>
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text fontWeight="medium">{t("coinManager.coinList")}</Text>
                <Flex gap={3}>
                  <Button
                    size="sm"
                    colorPalette="blue"
                    variant="solid"
                    loadingText={t("coinManager.loading")}
                    disabled={!hasMergeableCoins || loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.singleOperation}
                    onClick={handleBatchMerge}
                    title={!hasMergeableCoins ? t("coinManager.error.notEnoughCoins") : t("coinManager.batchMerge")}
                    loading={loadingState.batchMerge}
                  >
                    {t("coinManager.batchMerge")}
                  </Button>
                  <Button
                    size="sm"
                    colorPalette="red"
                    variant="solid"
                    loadingText={t("coinManager.loading")}
                    disabled={!hasZeroBalanceCoins || loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.singleOperation}
                    onClick={handleBatchCleanZero}
                    title={!hasZeroBalanceCoins ? t("coinManager.error.noZeroCoins") : t("coinManager.batchClean")}
                    loading={loadingState.batchCleanZero}
                  >
                    {t("coinManager.batchClean")}
                  </Button>
                  <Button
                    size="sm"
                    colorPalette="orange"
                    variant="solid"
                    loadingText={t("coinManager.loading")}
                    disabled={loadingState.fetchCoins || loadingState.batchMerge || loadingState.batchCleanZero || loadingState.batchBurn || loadingState.singleOperation}
                    onClick={handleBatchBurnLowValueCoins}
                    title={t("coinManager.batchBurn")}
                    loading={loadingState.batchBurn}
                  >
                    {t("coinManager.batchBurn")}
                  </Button>
                </Flex>
              </Flex>

              {loadingState.fetchCoins || loadingState.fetchPrices ? (
                <Box textAlign="center" py={10}>
                  <Spinner size="xl" />
                  <Text mt={4}>{t("coinManager.loading")}</Text>
                </Box>
              ) : coinTypeSummaries.length === 0 ? (
                <Box p={4} bg="teal.50" color="teal.800" borderRadius="md">
                  <Text>{t("coinManager.noCoins")}</Text>
                </Box>
              ) : (
                <CoinTypesList
                  coinTypeSummaries={coinTypeSummaries}
                  selectedCoinType={selectedCoinType}
                  selectedCoins={selectedCoins}
                  isLoading={loadingState.singleOperation}
                  onToggleCoinTypeExpansion={toggleCoinTypeExpansion}
                  onToggleCoinSelection={toggleCoinSelection}
                  onMergeCoin={autoMergeCoins}
                  onCleanZeroCoins={handleCleanZeroCoins}
                  onBurnCoin={handleBurnSelectedCoins}
                  onBurnSingleCoin={handleBurnSingleCoin}
                  onShowBurnDialog={handleShowBurnDialog}
                />
              )}
            </Box>
          </Stack>
        </Box>
      </Stack>

      {/* Standard Burn Confirmation Dialog */}
      <BurnConfirmationDialog
        isOpen={burnConfirmation.isOpen}
        onClose={() => setBurnConfirmation(prev => ({ ...prev, isOpen: false }))}
        title={burnConfirmation.title}
        message={burnConfirmation.message}
        onConfirm={burnConfirmation.onConfirm}
        isLoading={burnConfirmation.type === "single" ? loadingState.singleOperation : loadingState.batchBurn}
      />

      {/* New Multi-Select Burn Dialog */}
      <CoinBurnSelectionDialog
        isOpen={burnSelectionDialog.isOpen}
        onClose={handleBurnDialogClose}
        onConfirm={burnSelectionDialog.onConfirm}
        coins={coinTypeSummaries.find(s => s.type === burnSelectionDialog.coinType)?.objects || []}
        coinType={burnSelectionDialog.coinType}
        symbol={burnSelectionDialog.symbol}
        price={coinTypeSummaries.find(s => s.type === burnSelectionDialog.coinType)?.price || null}
        decimals={burnSelectionDialog.decimals}
        isLoading={loadingState.singleOperation}
      />
    </Container>
  );
};

export default CoinManager; 