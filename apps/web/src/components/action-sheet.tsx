import { Button, Modal } from '@mantine/core';
import type { ReactNode } from 'react';

export interface ActionSheetProps {
  opened: boolean;
  title: string;
  description?: string;
  metadata?: string[];
  formId: string;
  submitLabel: string;
  submitClassName?: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  onClose(): void;
  children: ReactNode;
}

export function ActionSheet({ opened, title, description, metadata = [], formId, submitLabel, submitClassName = 'wallet-button-primary', submitDisabled = false, submitting = false, onClose, children }: ActionSheetProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={null} centered={false} withCloseButton={false} classNames={{ content: 'wallet-action-sheet', body: 'wallet-action-sheet-body' }}>
      <div className="wallet-sheet-handle" aria-hidden="true" />
      <div className="wallet-sheet-heading wallet-sheet-heading-branded">
        <button type="button" className="wallet-sheet-close" aria-label="Close" onClick={onClose}>×</button>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {metadata.length > 0 ? (
          <div className="wallet-sheet-metadata" aria-label="Action metadata">
            {metadata.map((item) => <span key={item} className="wallet-pill">{item}</span>)}
          </div>
        ) : null}
      </div>
      <div className="wallet-action-sheet-content">{children}</div>
      <div className="wallet-sheet-footer">
        <Button type="button" className="wallet-button-secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form={formId} className={submitClassName} disabled={submitDisabled} loading={submitting}>{submitLabel}</Button>
      </div>
    </Modal>
  );
}
