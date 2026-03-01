import Modal from './Modal';
import GoldButton from './GoldButton';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: 'danger' | 'warning';
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel, loading, variant = 'danger',
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <Modal title={title} onClose={onCancel} maxWidth="max-w-sm">
      <p className="text-silver text-sm">{message}</p>
      <div className="flex gap-3 pt-2">
        <GoldButton variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </GoldButton>
        <GoldButton
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
          className="flex-1"
        >
          {confirmLabel}
        </GoldButton>
      </div>
    </Modal>
  );
}
