import { createToaster } from '@chakra-ui/react';

// Create a toaster instance that can be used throughout the app
export const toaster = createToaster({
  placement: 'top-end',
  duration: 3000,
});

// Toaster component - in Chakra UI v3, the Toast component is automatically rendered
// when using createToaster, so no additional component rendering is needed
export function Toaster() {
  return null;
} 