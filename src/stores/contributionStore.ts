import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContributionStats {
  // Monthly contributions
  monthlyContributions: number;
  monthlyTargetAmount: number;
  monthlyCompletionRate: number;
  monthlyPaymentRate: number;
  
  // Event contributions
  eventContributions: number;
  eventTargetAmount: number;
  eventCompletionRate: number;
  eventPaymentRate: number;
  
  // Project contributions
  projectContributions: number;
  projectTargetAmount: number;
  projectCompletionRate: number;
  projectPaymentRate: number;
  
  // Global stats
  totalContributions: number;
  totalTargetAmount: number;
  globalCompletionRate: number;
  globalPaymentRate: number;
  
  // Top contributors
  topContributors: Array<{
    userId: string;
    name: string;
    amount: number;
  }>;

  // Cache control
  lastUpdate: {
    monthly?: string;
    event?: string;
    project?: string;
    global?: string;
  };
}

interface ContributionStore extends ContributionStats {
  updateMonthlyStats: (stats: Partial<ContributionStats>) => void;
  updateEventStats: (stats: Partial<ContributionStats>) => void;
  updateProjectStats: (stats: Partial<ContributionStats>) => void;
  updateTopContributors: (contributors: ContributionStats['topContributors']) => void;
  invalidateCache: (type: 'monthly' | 'event' | 'project' | 'global') => void;
  shouldRefetch: (type: 'monthly' | 'event' | 'project' | 'global') => boolean;
  reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const initialState: ContributionStats = {
  monthlyContributions: 0,
  monthlyTargetAmount: 0,
  monthlyCompletionRate: 0,
  monthlyPaymentRate: 0,
  
  eventContributions: 0,
  eventTargetAmount: 0,
  eventCompletionRate: 0,
  eventPaymentRate: 0,
  
  projectContributions: 0,
  projectTargetAmount: 0,
  projectCompletionRate: 0,
  projectPaymentRate: 0,
  
  totalContributions: 0,
  totalTargetAmount: 0,
  globalCompletionRate: 0,
  globalPaymentRate: 0,
  
  topContributors: [],
  
  lastUpdate: {},
};

export const useContributionStore = create<ContributionStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      updateMonthlyStats: (stats) => 
        set((state) => {
          const newState = { 
            ...state, 
            ...stats,
            lastUpdate: {
              ...state.lastUpdate,
              monthly: new Date().toISOString(),
            }
          };
          return {
            ...newState,
            totalContributions: newState.monthlyContributions + newState.eventContributions + newState.projectContributions,
            totalTargetAmount: newState.monthlyTargetAmount + newState.eventTargetAmount + newState.projectTargetAmount,
            globalCompletionRate: calculateGlobalRate([
              { value: newState.monthlyCompletionRate, weight: newState.monthlyTargetAmount },
              { value: newState.eventCompletionRate, weight: newState.eventTargetAmount },
              { value: newState.projectCompletionRate, weight: newState.projectTargetAmount },
            ]),
            globalPaymentRate: calculateGlobalRate([
              { value: newState.monthlyPaymentRate, weight: newState.monthlyTargetAmount },
              { value: newState.eventPaymentRate, weight: newState.eventTargetAmount },
              { value: newState.projectPaymentRate, weight: newState.projectTargetAmount },
            ]),
          };
        }),
      
      updateEventStats: (stats) =>
        set((state) => {
          const newState = { 
            ...state, 
            ...stats,
            lastUpdate: {
              ...state.lastUpdate,
              event: new Date().toISOString(),
            }
          };
          return {
            ...newState,
            totalContributions: newState.monthlyContributions + newState.eventContributions + newState.projectContributions,
            totalTargetAmount: newState.monthlyTargetAmount + newState.eventTargetAmount + newState.projectTargetAmount,
            globalCompletionRate: calculateGlobalRate([
              { value: newState.monthlyCompletionRate, weight: newState.monthlyTargetAmount },
              { value: newState.eventCompletionRate, weight: newState.eventTargetAmount },
              { value: newState.projectCompletionRate, weight: newState.projectTargetAmount },
            ]),
            globalPaymentRate: calculateGlobalRate([
              { value: newState.monthlyPaymentRate, weight: newState.monthlyTargetAmount },
              { value: newState.eventPaymentRate, weight: newState.eventTargetAmount },
              { value: newState.projectPaymentRate, weight: newState.projectTargetAmount },
            ]),
          };
        }),
      
      updateProjectStats: (stats) =>
        set((state) => {
          const newState = { 
            ...state, 
            ...stats,
            lastUpdate: {
              ...state.lastUpdate,
              project: new Date().toISOString(),
            }
          };
          return {
            ...newState,
            totalContributions: newState.monthlyContributions + newState.eventContributions + newState.projectContributions,
            totalTargetAmount: newState.monthlyTargetAmount + newState.eventTargetAmount + newState.projectTargetAmount,
            globalCompletionRate: calculateGlobalRate([
              { value: newState.monthlyCompletionRate, weight: newState.monthlyTargetAmount },
              { value: newState.eventCompletionRate, weight: newState.eventTargetAmount },
              { value: newState.projectCompletionRate, weight: newState.projectTargetAmount },
            ]),
            globalPaymentRate: calculateGlobalRate([
              { value: newState.monthlyPaymentRate, weight: newState.monthlyTargetAmount },
              { value: newState.eventPaymentRate, weight: newState.eventTargetAmount },
              { value: newState.projectPaymentRate, weight: newState.projectTargetAmount },
            ]),
          };
        }),
      
      updateTopContributors: (contributors) =>
        set((state) => ({ 
          ...state, 
          topContributors: contributors,
          lastUpdate: {
            ...state.lastUpdate,
            global: new Date().toISOString(),
          }
        })),

      invalidateCache: (type) =>
        set((state) => ({
          ...state,
          lastUpdate: {
            ...state.lastUpdate,
            [type]: undefined,
          }
        })),

      shouldRefetch: (type) => {
        const lastUpdate = get().lastUpdate[type];
        if (!lastUpdate) return true;
        
        const lastUpdateTime = new Date(lastUpdate).getTime();
        const now = new Date().getTime();
        return now - lastUpdateTime > CACHE_DURATION;
      },
      
      reset: () => set(initialState),
    }),
    {
      name: 'contribution-store',
      partialize: (state) => ({
        monthlyContributions: state.monthlyContributions,
        eventContributions: state.eventContributions,
        projectContributions: state.projectContributions,
        totalContributions: state.totalContributions,
        lastUpdate: state.lastUpdate,
      }),
    }
  )
);

// Helper function to calculate weighted average for global rates
function calculateGlobalRate(items: Array<{ value: number; weight: number }>) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = items.reduce((sum, item) => sum + (item.value * item.weight), 0);
  return weightedSum / totalWeight;
}