import React from 'react';
import { Container, SimpleGrid, Heading } from '@chakra-ui/react';
import { FiSend, FiDroplet, FiInfo, FiKey, FiEdit } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import ToolCard from '../ToolCard/ToolCard';

// Tool definition interface
interface Tool {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: any;
  href: string;
}

// Available tools
const tools: Tool[] = [
  {
    id: 'bulk-transfer',
    titleKey: 'tools.bulkTransfer.title',
    descriptionKey: 'tools.bulkTransfer.description',
    icon: FiSend,
    href: '/bulk-transfer'
  },
  {
    id: 'faucet',
    titleKey: 'tools.faucet.title',
    descriptionKey: 'tools.faucet.description',
    icon: FiDroplet,
    href: '/faucet'
  },
];

const ToolList: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" mb={6}>{t('tools.title')}</Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {tools.map((tool) => (
          <ToolCard 
            key={tool.id}
            title={t(tool.titleKey)}
            description={t(tool.descriptionKey)}
            icon={tool.icon}
            href={tool.href}
          />
        ))}
      </SimpleGrid>
    </Container>
  );
};

export default ToolList; 