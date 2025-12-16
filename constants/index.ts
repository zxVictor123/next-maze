import { Difficulty } from '@/types';

/**
 * 难度配置
 * 密度越高，迷宫越大，难度越高
 */
export const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: {
    label: '简单',
    size: 15, // 15x15 迷宫
    description: '小迷宫，适合新手',
    branches: 8,
    branchMaxLength: 3,
  },
  [Difficulty.MEDIUM]: {
    label: '中等',
    size: 21, // 21x21 迷宫
    description: '中等大小，增加适量死路',
    branches: 22,
    branchMaxLength: 4,
  },
  [Difficulty.HARD]: {
    label: '困难',
    size: 31, // 31x31 迷宫
    description: '大型迷宫，更多死路',
    branches: 40,
    branchMaxLength: 5,
  },
} as const;
