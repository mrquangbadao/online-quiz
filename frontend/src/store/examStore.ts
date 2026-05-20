import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExamStartResponse, AnswerItem, ExamResultResponse } from '../types';

interface ExamState {
  contestantId: number | null;
  exam: ExamStartResponse | null;
  answers: Record<string, AnswerItem>;
  result: ExamResultResponse | null;
  currentSection: 'mc' | 'scenario';
  currentIndex: number;
  setContestantId: (id: number) => void;
  setExam: (exam: ExamStartResponse) => void;
  setAnswer: (answer: AnswerItem) => void;
  setResult: (result: ExamResultResponse) => void;
  setSection: (section: 'mc' | 'scenario') => void;
  setCurrentIndex: (index: number) => void;
  reset: () => void;
}

const initialState = {
  contestantId: null,
  exam: null,
  answers: {},
  result: null,
  currentSection: 'mc' as const,
  currentIndex: 0,
};

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      ...initialState,
      setContestantId: (id) => set({ contestantId: id }),
      setExam: (exam) => set({ exam }),
      setAnswer: (answer) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [`${answer.questionType}-${answer.questionId}`]: answer,
          },
        })),
      setResult: (result) => set({ result }),
      setSection: (section) => set({ currentSection: section, currentIndex: 0 }),
      setCurrentIndex: (index) => set({ currentIndex: index }),
      reset: () => set(initialState),
    }),
    { name: 'exam-state' },
  ),
);
