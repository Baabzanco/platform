import React from 'react';
import { CustomerStandingTier } from '../types/customer';

interface CreditStandingTagProps {
  standing?: CustomerStandingTier;
  standingLabel?: string;
  size?: 'xs' | 'sm';
  showDetailedLabel?: boolean;
}

const CREDIT_TAG_STYLES: Record<
  CustomerStandingTier,
  {
    shortLabel: string;
    fullLabel: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  green: {
    shortLabel: 'اعتبار سبز',
    fullLabel: 'اعتبار سبز (نقدی / فعال)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  yellow: {
    shortLabel: 'اعتبار زرد',
    fullLabel: 'اعتبار زرد (نزدیک سقف / موعد)',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-400',
    dotClass: 'bg-amber-500',
  },
  red: {
    shortLabel: 'اعتبار قرمز',
    fullLabel: 'اعتبار قرمز (اتمام اعتبار / معوق)',
    badgeClass: 'bg-red-50 text-red-800 border-red-300',
    dotClass: 'bg-red-600',
  },
  black: {
    shortLabel: 'بلک‌لیست',
    fullLabel: 'بلک‌لیست (مشکی)',
    badgeClass: 'bg-slate-900 text-white border-slate-900',
    dotClass: 'bg-white',
  },
};

export const CreditStandingTag: React.FC<CreditStandingTagProps> = ({
  standing = 'green',
  standingLabel,
  size = 'xs',
  showDetailedLabel = false,
}) => {
  const style = CREDIT_TAG_STYLES[standing] ?? CREDIT_TAG_STYLES.green;
  const displayText = showDetailedLabel
    ? standingLabel || style.fullLabel
    : style.shortLabel;

  return (
    <span
      title={standingLabel || style.fullLabel}
      className={`inline-flex items-center gap-1.5 rounded-md border font-bold whitespace-nowrap ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
      } ${style.badgeClass}`}
    >
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full shrink-0 ${style.dotClass}`}
      />
      <span>{displayText}</span>
    </span>
  );
};
