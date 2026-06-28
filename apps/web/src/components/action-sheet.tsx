import { Button, Modal } from '@mantine/core';
import type { ReactNode } from 'react';

export interface ActionSheetProps {
  opened: boolean;
  title: string;
  description?: string;
  formId: string;
  submitLabel: string;
  submitClassName?: string;
  submitting?: boolean;
  onClose(): void;
  children: ReactNode;
}

export function ActionSheet({ opened, title, description, formId, submitLabel, submitClassName = 'wallet-button-primary', submitting = false, onClose, children }: ActionSheetProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={null} centered={false} classNames={{ content: 'wallet-action-sheet', body: 'wallet-action-sheet-body' }}>
      <div className="wallet-sheet-handle" aria-hidden="true" />
      <div className="wallet-sheet-heading">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="wallet-action-sheet-content">{children}</div>
      <div className="wallet-sheet-footer">
        <Button type="button" className="wallet-button-secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form={formId} className={submitClassName} loading={submitting}>{submitLabel}</Button>
      </div>
    </Modal>
  );
}
