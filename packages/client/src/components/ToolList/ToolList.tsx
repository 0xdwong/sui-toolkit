import React from 'react';
import { Container, SimpleGrid, Heading } from '@chakra-ui/react';
import { FiSend, FiDroplet, FiInfo, FiKey, FiEdit } from 'react-icons/fi';
import ToolCard from '../ToolCard/ToolCard';

// Tool definition interface
interface Tool {
  id: string;
  title: string;
  description: string;
  icon: any;
  href: string;
}

// Available tools
const tools: Tool[] = [
  {
    id: 'bulk-transfer',
    title: '批量转账',
    description: '批量向多个地址转账 SUI 代币',
    icon: FiSend,
    href: '/bulk-transfer'
  },
  {
    id: 'faucet',
    title: '测试网水龙头',
    description: '获取测试网 SUI 代币',
    icon: FiDroplet,
    href: '/faucet'
  },
];

const ToolList: React.FC = () => {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" mb={6}>Toolkits</Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {tools.map((tool) => (
          <ToolCard 
            key={tool.id}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            href={tool.href}
          />
        ))}
      </SimpleGrid>
    </Container>
  );
};

export default ToolList; 