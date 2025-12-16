'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Cell, Position, Direction, Difficulty } from '@/types';
import { DIFFICULTY_CONFIG, MOVE_INTERVAL_MS, AUTO_MOVE_MS } from '@/constants';
import { generateMazeGrid, findShortestPath } from '@/lib/mazeUtils';

/**
 * 迷宫游戏组件
 */
export default function MazeGame() {

  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 1, y: 1 });
  const [endPos, setEndPos] = useState<Position>({ x: 0, y: 0 });
  const [trail, setTrail] = useState<Set<string>>(new Set());
  const [autoMoving, setAutoMoving] = useState(false);
  const [autoFinished, setAutoFinished] = useState(false);
  const activeDirectionRef = useRef<Direction | null>(null);
  const autoPathRef = useRef<Position[]>([]);
  const autoTimerRef = useRef<number | null>(null);

  // 根据难度获取迷宫大小
  const mazeSize = DIFFICULTY_CONFIG[difficulty].size;
  const MAZE_WIDTH = mazeSize;
  const MAZE_HEIGHT = mazeSize;
  const branchConfig = {
    branches: DIFFICULTY_CONFIG[difficulty].branches,
    branchMaxLength: DIFFICULTY_CONFIG[difficulty].branchMaxLength,
  };

  /**
   * 生成新迷宫
   */
  const generateMaze = useCallback(() => {
    const newMaze = generateMazeGrid(MAZE_WIDTH, MAZE_HEIGHT, branchConfig);
    setMaze(newMaze);
    setPlayerPos({ x: 1, y: 1 }); // 重置玩家位置到起点
    setEndPos({ x: MAZE_WIDTH - 2, y: MAZE_HEIGHT - 2 }); // 设置终点位置
    setTrail(new Set());
    setAutoMoving(false);
    setAutoFinished(false);
    autoPathRef.current = [];
    if (autoTimerRef.current) {
      window.clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, [MAZE_WIDTH, MAZE_HEIGHT]);

  /**
   * 初始化迷宫和难度改变时重新生成
   */
  useEffect(() => {
    generateMaze();
  }, [generateMaze, difficulty]);

  /**
   * 检查是否可以移动到指定位置
   */
  const canMove = useCallback(
    (x: number, y: number): boolean => {
      if (x < 0 || x >= MAZE_WIDTH || y < 0 || y >= MAZE_HEIGHT) {
        return false;
      }
      // maze[x][y] 直接对应坐标 (x, y)
      return maze[x]?.[y] === 1;
    },
    [maze, MAZE_WIDTH, MAZE_HEIGHT]
  );

  /**
   * 移动玩家
   */
  const movePlayer = useCallback(
    (direction: Direction) => {
      if (autoMoving) return;
      setPlayerPos((prev) => {
        let newX = prev.x;
        let newY = prev.y;

        switch (direction) {
          case Direction.UP:
            newY -= 1;
            break;
          case Direction.DOWN:
            newY += 1;
            break;
          case Direction.LEFT:
            newX -= 1;
            break;
          case Direction.RIGHT:
            newX += 1;
            break;
        }

        if (canMove(newX, newY)) {
          return { x: newX, y: newY };
        }
        return prev;
      });
    },
    [canMove, autoMoving]
  );

  /**
   * 键盘事件处理
   */
  useEffect(() => {
    /**
     * 将键值映射为方向
     */
    const keyToDirection = (key: string): Direction | null => {
      switch (key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          return Direction.UP;
        case 's':
        case 'arrowdown':
          return Direction.DOWN;
        case 'a':
        case 'arrowleft':
          return Direction.LEFT;
        case 'd':
        case 'arrowright':
          return Direction.RIGHT;
        default:
          return null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (autoMoving) return;
      const direction = keyToDirection(e.key);
      if (!direction) return;
      e.preventDefault();
      // 记录当前方向并立即移动一次，避免键盘重复的起始延迟
      activeDirectionRef.current = direction;
      movePlayer(direction);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (autoMoving) return;
      const direction = keyToDirection(e.key);
      if (!direction) return;
      e.preventDefault();
      // 仅当松开的方向与当前方向一致时，停止持续移动
      if (activeDirectionRef.current === direction) {
        activeDirectionRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [movePlayer]);

  /**
   * 按住方向键持续移动
   */
  useEffect(() => {
    const interval = window.setInterval(() => {
      const direction = activeDirectionRef.current;
      if (direction && !autoMoving) {
        movePlayer(direction);
      }
    }, MOVE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [movePlayer, MOVE_INTERVAL_MS, autoMoving]);

  /**
   * 自动通关：沿路径移动并留下轨迹
   */
  const startAutoSolve = useCallback(() => {
    if (autoMoving) return;
    const path = findShortestPath(maze, playerPos, endPos);
    if (path.length === 0) return;
    // 第一格是当前位置，后续为行进路径
    autoPathRef.current = path.slice(1);
    setTrail(new Set([`${playerPos.x},${playerPos.y}`]));
    setAutoFinished(false);
    setAutoMoving(true);
  }, [maze, playerPos, endPos, autoMoving]);

  /**
   * 自动通关时的逐步移动
   */
  useEffect(() => {
    if (!autoMoving) {
      if (autoTimerRef.current) {
        window.clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      return;
    }

    autoTimerRef.current = window.setInterval(() => {
      const next = autoPathRef.current.shift();
      if (!next) {
        setAutoMoving(false);
        setAutoFinished(true);
        if (autoTimerRef.current) {
          window.clearInterval(autoTimerRef.current);
          autoTimerRef.current = null;
        }
        return;
      }

      setPlayerPos(next);
      setTrail((prev) => {
        const newTrail = new Set(prev);
        newTrail.add(`${next.x},${next.y}`);
        return newTrail;
      });
    }, AUTO_MOVE_MS);

    return () => {
      if (autoTimerRef.current) {
        window.clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [autoMoving, AUTO_MOVE_MS]);

  /**
   * 重新挑战：清空轨迹并回到起点
   */
  const retryMaze = useCallback(() => {
    setAutoFinished(false);
    setAutoMoving(false);
    setTrail(new Set());
    setPlayerPos({ x: 1, y: 1 });
    autoPathRef.current = [];
    if (autoTimerRef.current) {
      window.clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  /**
   * 检查是否到达终点
   */
  const isWin = playerPos.x === endPos.x && playerPos.y === endPos.y;
  const showCompletionActions = autoFinished || isWin;

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h1 className="text-3xl font-bold mb-4">走迷宫游戏</h1>
      
      {/* 控制说明 */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        使用 WASD 或方向键控制移动
      </div>

      {/* 难度选择 */}
      <div className="flex flex-col items-center gap-4 mb-4">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          选择难度：
        </div>
        <div className="flex gap-3">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => {
            const config = DIFFICULTY_CONFIG[diff];
            const isSelected = difficulty === diff;
            return (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {DIFFICULTY_CONFIG[difficulty].description} ({mazeSize}x{mazeSize})
        </div>
      </div>

      {/* 生成新迷宫按钮 */}
      <button
        onClick={generateMaze}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={autoMoving}
      >
        生成新迷宫
      </button>

      {/* 一键通关 */}
      <button
        onClick={startAutoSolve}
        className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={autoMoving}
      >
        一键通关
      </button>

      {/* 通关后的操作：自动通关或手动通关后都显示 */}
      {showCompletionActions && (
        <div className="flex gap-3 mt-2">
          <button
            onClick={retryMaze}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium"
          >
            重新挑战
          </button>
          <button
            onClick={generateMaze}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            下一关
          </button>
        </div>
      )}

      {/* 胜利提示 */}
      {isWin && (
        <div className="text-2xl font-bold text-green-600 dark:text-green-400 animate-pulse">
          恭喜！你到达了终点！🎉
        </div>
      )}

      {/* 迷宫显示 */}
      <div className="flex justify-center overflow-auto max-w-full">
        <div
          className="grid gap-0 border-2 border-gray-800 dark:border-gray-200"
          style={{
            gridTemplateColumns: `repeat(${MAZE_WIDTH}, ${mazeSize <= 21 ? '20px' : '15px'})`,
            gridTemplateRows: `repeat(${MAZE_HEIGHT}, ${mazeSize <= 21 ? '20px' : '15px'})`,
          }}
        >
          {/* CSS Grid 按行填充，所以先遍历 y（行），再遍历 x（列） */}
          {maze.length > 0 && Array.from({ length: MAZE_HEIGHT }, (_, y) =>
            Array.from({ length: MAZE_WIDTH }, (_, x) => {
              // 安全检查：确保 maze[x] 和 maze[x][y] 存在
              const cell = maze[x]?.[y] ?? 0;
              const isPlayer = playerPos.x === x && playerPos.y === y;
              const isEnd = endPos.x === x && endPos.y === y;
              const inTrail = trail.has(`${x},${y}`);

              const cellSize = mazeSize <= 21 ? 20 : 15;
              const playerSize = mazeSize <= 21 ? 16 : 12;
              
              return (
                <div
                  key={`${x}-${y}`}
                  className={`${cellSize === 20 ? 'w-5 h-5' : 'w-3.75 h-3.75'} flex items-center justify-center ${
                    cell === 0
                      ? 'bg-gray-800 dark:bg-gray-700'
                      : inTrail
                        ? 'bg-yellow-300 dark:bg-yellow-500'
                        : 'bg-white dark:bg-gray-900'
                  }`}
                >
                  {isPlayer && (
                    <div className={`${playerSize === 16 ? 'w-4 h-4' : 'w-3 h-3'} bg-blue-600 rounded-full animate-pulse`} />
                  )}
                  {isEnd && !isPlayer && (
                    <div className={`${playerSize === 16 ? 'w-4 h-4' : 'w-3 h-3'} bg-green-500 rounded-full`} />
                  )}
                </div>
              );
            })
          ).flat()}
        </div>
      </div>
    </div>
  );
}
