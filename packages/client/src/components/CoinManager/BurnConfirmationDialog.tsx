import React from "react";
import {
  Button,
  Dialog,
  Portal,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

interface BurnConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading: boolean;
}

const BurnConfirmationDialog: React.FC<BurnConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading
}) => {
  const { t } = useTranslation();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open={isOpen} role="alertdialog" onOpenChange={(open: boolean) => !open && onClose()} initialFocusEl={cancelRef}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            
            <Dialog.Body>
              {message}
            </Dialog.Body>
            
            <Dialog.Footer>
              <Button ref={cancelRef} onClick={onClose} disabled={isLoading}>
                {t("common.cancel")}
              </Button>
              <Button 
                colorPalette="red" 
                onClick={onConfirm} 
                ml={3}
                loading={isLoading}
                loadingText={t("coinManager.loading")}
              >
                {t("common.confirm")}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default BurnConfirmationDialog; 