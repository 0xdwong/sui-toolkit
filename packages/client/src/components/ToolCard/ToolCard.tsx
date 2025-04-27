import React from "react";
import { Box, Heading, Text, LinkBox, Icon } from "@chakra-ui/react";
import { IconType } from "react-icons";
import { useNavigate } from "react-router-dom";

export interface ToolCardProps {
  title: string;
  description: string;
  icon: IconType;
  href: string;
}

const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon,
  href,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Check if the href is an external link
    if (href.startsWith("http://") || href.startsWith("https://")) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      // Internal navigation using react-router
      navigate(href);
    }
  };

  return (
    <LinkBox as="article" role="group">
      <Box
        p={5}
        borderWidth="1px"
        borderRadius="lg"
        bg="white"
        transition="all 0.2s"
        _hover={{
          transform: "translateY(-4px)",
          shadow: "md",
          borderColor: "blue.300",
        }}
        height="100%"
        display="flex"
        flexDirection="column"
        onClick={handleClick}
        cursor="pointer"
      >
        <Box display="flex" alignItems="center" mb={3}>
          <Icon as={icon} boxSize="24px" color="blue.500" mr={2} />
          <Heading size="md">{title}</Heading>
        </Box>
        <Text color="gray.600">{description}</Text>
      </Box>
    </LinkBox>
  );
};

export default ToolCard;
