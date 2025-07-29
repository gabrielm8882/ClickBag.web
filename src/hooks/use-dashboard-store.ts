
import { create } from 'zustand';

interface DashboardState {
  testPoints: number | null;
  testDailyTrees: number;
  setTestPoints: (points: number | null) => void;
  setTestDailyTrees: (updater: (current: number) => number) => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  testPoints: null,
  testDailyTrees: 0,
  setTestPoints: (points) => set({ testPoints: points }),
  setTestDailyTrees: (updater) => set((state) => ({ testDailyTrees: updater(state.testDailyTrees) })),
}));

    