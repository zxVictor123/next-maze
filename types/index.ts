/**
 * 迷宫单元格类型
 * 0: 墙
 * 1: 路径
 */
export type Cell = 0 | 1;

/**
 * 坐标类型
 */
export type Position = {
  x: number;
  y: number;
};

/**
 * 方向枚举
 */
export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

/**
 * 难度级别枚举
 */
export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}
