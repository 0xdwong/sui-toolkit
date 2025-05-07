import React from "react";
import { Text, Box, Flex, useClipboard } from "@chakra-ui/react";

interface CopyableTextProps {
  text: string;
  displayText: string;
  label: string;
}

// CopyableText 组件 - 用于替换重复的复制逻辑
const CopyableText: React.FC<CopyableTextProps> = ({ text, displayText, label }) => {
  const { onCopy, hasCopied } = useClipboard(text);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy();
  };

  return (
    <Flex alignItems="center">
      <Text fontFamily="monospace" fontSize="0.9em" mr={2}>
        {displayText}
      </Text>
      <Box
        as="button"
        aria-label={label}
        title={hasCopied ? "已复制!" : "复制完整内容"}
        onClick={handleCopy}
        p={1}
        borderRadius="md"
        color="gray.500"
        _hover={{ color: "blue.500", bg: "gray.100" }}
        fontSize="sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </Box>
    </Flex>
  );
};

export default CopyableText; 