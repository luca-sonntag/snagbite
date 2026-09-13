import type { ReactNode } from 'react';

export interface PremiumModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export interface PremiumFeatureItem {
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
