import React, { useState, useEffect } from "react";
import { Text, Box, Flex, useClipboard } from "@chakra-ui/react";

interface CopyableTextProps {
  text: string;
  displayText: string;
  label: string;
}

// CopyableText component - Used to replace repetitive copy logic
const CopyableText: React.FC<CopyableTextProps> = ({ text, displayText, label }) => {
  // Using both Chakra's useClipboard and manual state for better control
  const clipboard = useClipboard({ value: text, timeout: 1000 });
  const [hasCopied, setHasCopied] = useState(false);

  // Reset the copied state after timeout
  useEffect(() => {
    if (hasCopied) {
      const timer = setTimeout(() => {
        setHasCopied(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCopied]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // Try to use Chakra's clipboard method
      await clipboard.copy();
      await navigator.clipboard.writeText(text);
      console.log("Copied using navigator.clipboard");

      // Set our own copied state
      setHasCopied(true);
      console.log("Copy triggered", text);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <Flex alignItems="center">
      <Text fontFamily="monospace" fontSize="0.9em" mr={2}>
        {displayText}
      </Text>
      <Box
        as="button"
        aria-label={label}
        title={hasCopied || clipboard.copied ? "Copied!" : "Copy full content"}
        onClick={handleCopy}
        p={1}
        borderRadius="md"
        color={hasCopied || clipboard.copied ? "green.500" : "gray.500"}
        _hover={{ color: "blue.500", bg: "gray.100" }}
        fontSize="sm"
      >
        {hasCopied || clipboard.copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        )}
      </Box>
    </Flex>
  );
};

export default CopyableText; 