import type { CheckoutWorkflowState } from '@aimee.shop/sdk';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'address', label: 'Address' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

/** Map server workflowState to the customer-facing step indicator. */
export function workflowStateToStep(
  workflowState: CheckoutWorkflowState | undefined
): StepId {
  switch (workflowState) {
    case 'shipping_selection':
      return 'shipping';
    case 'payment_setup':
      return 'payment';
    case 'review':
    case 'processing':
    case 'complete':
      return 'review';
    case 'cart_review':
    case 'address_collection':
    default:
      return 'address';
  }
}

export function CheckoutSteps({
  workflowState,
}: {
  workflowState: CheckoutWorkflowState | undefined;
}) {
  const active = workflowStateToStep(workflowState);
  const activeIndex = STEPS.findIndex((s) => s.id === active);

  return (
    <nav aria-label="Checkout progress">
      <ol className="flex flex-wrap items-center gap-2 sm:gap-0">
        {STEPS.map((step, index) => {
          const isComplete = index < activeIndex;
          const isCurrent = index === activeIndex;
          return (
            <li
              key={step.id}
              className="flex items-center gap-2 sm:flex-1"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                  isCurrent &&
                    'border-primary bg-primary text-primary-foreground',
                  isComplete &&
                    'border-primary bg-primary/10 text-primary',
                  !isCurrent &&
                    !isComplete &&
                    'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'text-sm',
                  isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className="mx-2 hidden h-px flex-1 bg-border sm:block"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
