import type { ReactNode } from 'react';

export interface PremiumModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export type PremiumFeatureId =
  | 'extractions'
  | 'noAds'
  | 'healthScore'
  | 'remix'
  | 'cookingMode'
  | 'collections';

export interface PremiumFeatureItem {
  id: PremiumFeatureId;
  title: string;
  desc: string;
  icon: ReactNode;
}

export interface SubscriptionPackageProduct {
  identifier: string;
  price?: number;
  priceString: string;
  pricePerMonthString?: string;
  introPrice?: {
    price: number;
    periodNumberOfUnits?: number;
  } | null;
}

export interface SubscriptionPackage {
  identifier: string;
  packageType: string;
  product: SubscriptionPackageProduct;
}
