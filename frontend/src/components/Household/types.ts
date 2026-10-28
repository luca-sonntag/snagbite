export interface HouseholdPartnerProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export type HouseholdStatus = 'none' | 'pending' | 'active' | 'paused' | 'unlinked';

export interface HouseholdContextData {
  householdId: string | null;
  partnerId: string | null;
  partnerProfile: HouseholdPartnerProfile | null;
  status: HouseholdStatus;
  isTrialActive: boolean;
  trialEndsAt: string | null;
  hasHouseholdPro: boolean;
  isPauseLocked: boolean;
  requiresExtractionAds: boolean;
  inviteCode: string | null;
  cooldownUntil: string | null;
}

export interface HouseholdState extends HouseholdContextData {
  loading: boolean;
  refreshHousehold: () => Promise<void>;
  createInvite: () => Promise<{ inviteCode: string }>;
  acceptInvite: (codeOrId: string) => Promise<{ success: boolean; error?: string }>;
  proposeCook: (recipeId: string) => Promise<{ success: boolean; sent?: boolean; error?: string }>;
  nudgePartner: () => Promise<{ success: boolean; error?: string }>;
  unlink: () => Promise<{ success: boolean; error?: string }>;
}
