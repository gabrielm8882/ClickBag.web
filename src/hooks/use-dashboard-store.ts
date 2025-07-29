
import { create } from 'zustand';

interface DashboardState {
  testPoints: number | null;
  testDailyTrees: number;
  setTestPoints: (points: number | null) => void;
  setTestDailyTrees: (trees: number) => void;
  resetDailyTrees: () => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  testPoints: null,
  testDailyTrees: 0,
  setTestPoints: (points) => set({ testPoints: points }),
  setTestDailyTrees: (trees) => set((state) => ({ testDailyTrees: state.testDailyTrees + trees })),
  resetDailyTrees: () => set({ testDailyTrees: 0 }),
}));
