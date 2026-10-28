export interface HouseholdPartnerProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface HouseholdContext {
  householdId: string | null;
  partnerId: string | null;
  partnerProfile: HouseholdPartnerProfile | null;
  status: 'none' | 'pending' | 'active' | 'paused' | 'unlinked';
  isTrialActive: boolean;
  trialEndsAt: string | null;
  hasHouseholdPro: boolean;
  isPauseLocked: boolean;
  requiresExtractionAds: boolean;
  inviteCode: string | null;
  cooldownUntil: string | null;
}
