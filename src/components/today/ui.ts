/** Shared class strings so interactive states stay consistent across the flow. */

export const primaryButton =
  'rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:bg-[#9a4523] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

export const ghostButton =
  'rounded-full border border-line bg-transparent px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

export const quietButton =
  'rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export const textInput =
  'w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none';

export const fieldLabel = 'mb-1 block text-xs font-medium uppercase tracking-wide text-muted';
