'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 迷宫单元格类型
 * 0: 墙
 * 1: 路径
 */
type Cell = 0 | 1;

/**
 * 坐标类型
 */
type Position = {
  x: number;
  y: number;
};

/**
 * 方向枚举
 */
enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

/**
 * 难度级别枚举
 */
enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

/**
 * 难度配置
 * 密度越高，迷宫越大，难度越高
 */
const DIFFICULTY_CONFIG = {
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

/**
 * Fisher-Yates 洗牌算法
 */
const shuffle = <T,>(array: T[]): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

/**
 * 递归回溯算法：挖通道
 */
const carvePassage = (
  x: number,
  y: number,
  maze: Cell[][],
  visited: boolean[][],
  width: number,
  height: number
): void => {
  visited[y][x] = true;
  maze[y][x] = 1;

  const directions = [
    [0, -2], // 上
    [0, 2],  // 下
    [-2, 0], // 左
    [2, 0],  // 右
  ];

  // 随机打乱方向
  shuffle(directions);

  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    if (
      nx > 0 &&
      nx < width - 1 &&
      ny > 0 &&
      ny < height - 1 &&
      !visited[ny][nx]
    ) {
      // 打通中间的墙
      maze[y + dy / 2][x + dx / 2] = 1;
      carvePassage(nx, ny, maze, visited, width, height);
    }
  }
};

/**
 * 为迷宫增加分支，制造更多死路
 */
const addBranches = (
  maze: Cell[][],
  branches: number,
  branchMaxLength: number
): Cell[][] => {
  const height = maze.length;
  const width = maze[0]?.length ?? 0;
  const dirs: Position[] = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  const isWall = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height && maze[y]?.[x] === 0;
  const isPath = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height && maze[y]?.[x] === 1;

  for (let i = 0; i < branches; i++) {
    const pathCells: Position[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (maze[y][x] === 1) {
          pathCells.push({ x, y });
        }
      }
    }
    if (pathCells.length === 0) break;
    const start = pathCells[Math.floor(Math.random() * pathCells.length)];

    const shuffledDirs = [...dirs];
    shuffle(shuffledDirs);
    let chosenDir: Position | null = null;
    for (const d of shuffledDirs) {
      if (isWall(start.x + d.x, start.y + d.y)) {
        chosenDir = d;
        break;
      }
    }
    if (!chosenDir) continue;

    const length = Math.floor(Math.random() * branchMaxLength) + 1;
    let cx = start.x;
    let cy = start.y;
    for (let step = 0; step < length; step++) {
      const nx = cx + chosenDir.x;
      const ny = cy + chosenDir.y;
      if (!isWall(nx, ny)) break;
      if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) break;

      const neighborPaths = dirs.filter(
        (d) => isPath(nx + d.x, ny + d.y) && !(nx + d.x === cx && ny + d.y === cy)
      );
      if (neighborPaths.length > 0) break;

      maze[ny][nx] = 1;
      cx = nx;
      cy = ny;
    }
  }

  return maze;
};

/**
 * 生成迷宫函数
 * 使用递归回溯算法生成迷宫
 */
const generateMazeGrid = (
  width: number,
  height: number,
  options?: { branches?: number; branchMaxLength?: number }
): Cell[][] => {
  const maze: Cell[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(0));
  const visited: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  // 从 (1, 1) 开始生成，确保边界是墙
  carvePassage(1, 1, maze, visited, width, height);

  // 确保起点和终点是路径
  maze[1][1] = 1; // 起点
  maze[height - 2][width - 2] = 1; // 终点

  if (options?.branches && options.branches > 0) {
    addBranches(maze, options.branches, options.branchMaxLength ?? 3);
  }

  return maze;
};

/**
 * 基于 BFS 的最短路径查找
 */
const findShortestPath = (
  maze: Cell[][],
  start: Position,
  end: Position
): Position[] => {
  const height = maze.length;
  const width = maze[0]?.length ?? 0;
  const visited = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));
  const prev: (Position | null)[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(null));

  const queue: Position[] = [start];
  visited[start.y][start.x] = true;

  const directions: Position[] = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift() as Position;
    if (current.x === end.x && current.y === end.y) {
      break;
    }

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (
        nx >= 0 &&
        nx < width &&
        ny >= 0 &&
        ny < height &&
        !visited[ny][nx] &&
        maze[ny]?.[nx] === 1
      ) {
        visited[ny][nx] = true; 
        prev[ny][nx] = current;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  // 回溯路径
  const path: Position[] = [];
  let cur: Position | null = end;
  if (!visited[end.y]?.[end.x]) {
    return [];
  }
  while (cur) {
    path.push(cur);
    cur = prev[cur.y][cur.x];
  }
  return path.reverse();
};

/**
 * 迷宫游戏组件
 */
export default function MazeGame() {
  const MOVE_INTERVAL_MS = 70; // 按下方向键后的持续移动间隔
  const AUTO_MOVE_MS = 80; // 自动通关时的移动间隔
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
      return maze[y]?.[x] === 1;
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
          {maze.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = playerPos.x === x && playerPos.y === y;
              const isEnd = endPos.x === x && endPos.y === y;
              const inTrail = trail.has(`${x},${y}`);

              const cellSize = mazeSize <= 21 ? 20 : 15;
              const playerSize = mazeSize <= 21 ? 16 : 12;
              
              return (
                <div
                  key={`${x}-${y}`}
                  className={`${cellSize === 20 ? 'w-5 h-5' : 'w-[15px] h-[15px]'} flex items-center justify-center ${
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
          )}
        </div>
      </div>
    </div>
  );
}
