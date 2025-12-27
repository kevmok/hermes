/**
 * Shared data state components for loading, empty, and error states.
 *
 * Provides consistent UX across all data-fetching components.
 */
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { Button } from './button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Alert01Icon,
  InboxIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';

interface DataLoadingProps {
  /** Number of skeleton items to show */
  count?: number;
  /** Variant for different layouts */
  variant?: 'card' | 'list' | 'grid';
  className?: string;
}

/**
 * Loading state with skeleton placeholders
 */
export function DataLoading({
  count = 3,
  variant = 'card',
  className,
}: DataLoadingProps) {
  return (
    <div
      className={cn(
        variant === 'grid' &&
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        variant === 'list' && 'flex flex-col gap-3',
        variant === 'card' && 'flex flex-col gap-4',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-xl border border-white/[0.06] bg-white/[0.02] p-5',
            'animate-pulse',
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {variant === 'card' ? (
            <>
              <div className='flex items-start justify-between gap-4 mb-4'>
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-5 w-3/4' />
                  <Skeleton className='h-3 w-1/4' />
                </div>
                <Skeleton className='h-11 w-11 rounded-xl' />
              </div>
              <div className='flex gap-2 mb-4'>
                <Skeleton className='h-6 w-20 rounded-full' />
                <Skeleton className='h-6 w-24 rounded-full' />
              </div>
              <Skeleton className='h-1.5 w-full rounded-full mb-4' />
              <div className='flex gap-4 mb-4'>
                <Skeleton className='h-12 flex-1 rounded-lg' />
                <Skeleton className='h-12 flex-1 rounded-lg' />
              </div>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-2/3 mt-1' />
            </>
          ) : variant === 'list' ? (
            <div className='flex items-center gap-4'>
              <Skeleton className='h-10 w-10 rounded-lg' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-3 w-1/2' />
              </div>
              <Skeleton className='h-6 w-16 rounded-full' />
            </div>
          ) : (
            <>
              <Skeleton className='h-32 w-full rounded-lg mb-3' />
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-3 w-1/2 mt-2' />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

interface DataEmptyProps {
  /** Title for empty state */
  title?: string;
  /** Description for empty state */
  description?: string;
  /** Icon to display */
  icon?: typeof InboxIcon;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Empty state when no data is available
 */
export function DataEmpty({
  title = 'No data yet',
  description = 'Check back later for updates.',
  icon: Icon = InboxIcon,
  action,
  className,
}: DataEmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        'rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01]',
        className,
      )}
    >
      <div className='relative mb-4'>
        <div className='absolute inset-0 bg-cyan-500/10 blur-xl rounded-full' />
        <div className='relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08]'>
          <HugeiconsIcon
            icon={Icon}
            size={28}
            className='text-muted-foreground/60'
          />
        </div>
      </div>
      <h3 className='text-lg font-semibold text-white/80 mb-1'>{title}</h3>
      <p className='text-sm text-muted-foreground/60 max-w-sm'>{description}</p>
      {action && (
        <Button
          variant='outline'
          size='sm'
          className='mt-4'
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface DataErrorProps {
  /** Error title */
  title?: string;
  /** Error message */
  message?: string;
  /** Retry function */
  onRetry?: () => void;
  className?: string;
}

/**
 * Error state when data fetching fails
 */
export function DataError({
  title = 'Something went wrong',
  message = 'Failed to load data. Please try again.',
  onRetry,
  className,
}: DataErrorProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        'rounded-xl border border-red-500/20 bg-red-500/[0.02]',
        className,
      )}
    >
      <div className='relative mb-4'>
        <div className='absolute inset-0 bg-red-500/10 blur-xl rounded-full' />
        <div className='relative flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20'>
          <HugeiconsIcon
            icon={Alert01Icon}
            size={28}
            className='text-red-400'
          />
        </div>
      </div>
      <h3 className='text-lg font-semibold text-red-300 mb-1'>{title}</h3>
      <p className='text-sm text-red-300/60 max-w-sm'>{message}</p>
      {onRetry && (
        <Button
          variant='outline'
          size='sm'
          className='mt-4 border-red-500/30 text-red-300 hover:bg-red-500/10'
          onClick={onRetry}
        >
          <HugeiconsIcon icon={RefreshIcon} size={14} className='mr-2' />
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Inline loading indicator for smaller areas
 */
export function InlineLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center gap-2 text-muted-foreground', className)}
    >
      <div className='relative h-4 w-4'>
        <div className='absolute inset-0 rounded-full border-2 border-current opacity-20' />
        <div className='absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin' />
      </div>
      <span className='text-sm'>Loading...</span>
    </div>
  );
}
