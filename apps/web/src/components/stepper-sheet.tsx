import { Button, Modal } from '@mantine/core';
import type { ReactNode } from 'react';

export interface StepperSheetProps {
  opened: boolean;
  title: string;
  description?: string;
  metadata?: string[];
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  submitting?: boolean;
  onBack(): void;
  onNext(): void;
  onClose(): void;
  onSubmit(): void;
  children: ReactNode;
}

export function StepperSheet({ opened, title, description, metadata = [], currentStep, totalSteps, canGoNext, submitting = false, onBack, onNext, onClose, onSubmit, children }: StepperSheetProps) {
  const isFinalStep = currentStep === totalSteps;

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
      <div className="wallet-stepper-sheet-progress" aria-label={`Step ${currentStep} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <span key={index} className={index + 1 <= currentStep ? 'wallet-stepper-dot wallet-stepper-dot-active' : 'wallet-stepper-dot'} />
        ))}
      </div>
      <div className="wallet-action-sheet-content">{children}</div>
      <div className="wallet-sheet-footer">
        <Button type="button" className="wallet-button-secondary" onClick={currentStep === 1 ? onClose : onBack}>Back</Button>
        <Button type="button" className="wallet-button-primary" loading={submitting} disabled={!canGoNext} onClick={isFinalStep ? onSubmit : onNext}>
          {isFinalStep ? 'Create recurring' : 'Next'}
        </Button>
      </div>
    </Modal>
  );
}
