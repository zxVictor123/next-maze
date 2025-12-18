import { Cell, Position, Direction } from '@/types';

/**
 * Fisher-Yates 洗牌算法
 */
export const shuffle = <T,>(array: T[]): void => {
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
  // maze[x][y] 直接对应坐标 (x, y)
  visited[x][y] = true;
  maze[x][y] = 1;

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
      !visited[nx][ny]
    ) {
      // 打通中间的墙：从 (x, y) 到 (nx, ny)，中间墙在 (x + dx/2, y + dy/2)
      maze[x + dx / 2][y + dy / 2] = 1;
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
  // maze[x][y] 结构：外层是 x（列），内层是 y（行）
  const width = maze.length;
  const height = maze[0]?.length ?? 0;
  const dirs: Position[] = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];
// 定义 判断是否是墙和路的工具
  const isWall = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height && maze[x]?.[y] === 0;
  const isPath = (x: number, y: number) =>
    x >= 0 && x < width && y >= 0 && y < height && maze[x]?.[y] === 1;
// 找到所有打通的路格
  for (let i = 0; i < branches; i++) {
    const pathCells: Position[] = [];
    for (let x = 1; x < width - 1; x++) {
      for (let y = 1; y < height - 1; y++) {
        if (maze[x][y] === 1) {
          pathCells.push({ x, y });
        }
      }
    }
    if (pathCells.length === 0) break;
    // 从已经打通的路格中选一个作为起点供后续打通别的分支
    const start = pathCells[Math.floor(Math.random() * pathCells.length)];
// 打乱方向, 选一个开挖
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
// 确定最终长度以及起点, 准备正式开挖
    const length = Math.floor(Math.random() * branchMaxLength) + 1;
    let cx = start.x;
    let cy = start.y;
    // 开挖
    for (let step = 0; step < length; step++) {
      const nx = cx + chosenDir.x;
      const ny = cy + chosenDir.y;
      if (!isWall(nx, ny)) break;
      if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) break;
// 避免挖到已有通路旁边导致死路和通路连接
      const neighborPathsDirs = dirs.filter(
        (d) => isPath(nx + d.x, ny + d.y) && !(nx + d.x === cx && ny + d.y === cy)
      );
      if (neighborPathsDirs.length > 0) break;

      maze[nx][ny] = 1;
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
export const generateMazeGrid = (
  width: number,
  height: number,
  options?: { branches?: number; branchMaxLength?: number }
): Cell[][] => {
  // 数组结构：maze[x][y]，外层是 x（列），内层是 y（行）
  const maze: Cell[][] = Array(width)
    .fill(null)
    .map(() => Array(height).fill(0));
  const visited: boolean[][] = Array(width)
    .fill(null)
    .map(() => Array(height).fill(false));

  // 从 (1, 1) 开始生成，确保边界是墙
  carvePassage(1, 1, maze, visited, width, height);

  // 确保起点和终点是路径
  maze[1][1] = 1; // 起点
  maze[width - 2][height - 2] = 1; // 终点

  if (options?.branches && options.branches > 0) {
    addBranches(maze, options.branches, options.branchMaxLength ?? 3);
  }

  return maze;
};

/**
     * 定义 将玩家按下的键值映射为方向的函数
     */
    export const keyToDirection = (key: string): Direction | null => {
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

/**
 * 基于 BFS 的最短路径查找, 核心思想:离起点最近的节点先被访问
 */
export const findShortestPath = (
  maze: Cell[][],
  start: Position,
  end: Position
): Position[] => {
  // maze[x][y] 结构：外层是 x（列），内层是 y（行）
  const width = maze.length;
  const height = maze[0]?.length ?? 0;
  const visited = Array(width)
    .fill(null)
    .map(() => Array(height).fill(false));
    // 最近父节点（离起点）
  const prev: (Position | null)[][] = Array(width)
    .fill(null)
    .map(() => Array(height).fill(null));

  const queue: Position[] = [start];
  visited[start.x][start.y] = true;

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
        nx >= 1 &&
        nx < width - 1 &&
        ny >= 1 &&
        ny < height - 1 &&
        !visited[nx][ny] &&
        maze[nx]?.[ny] === 1
      ) {
        // 当前节点就是新节点的父节点中第一个到达的, 所以是离起点最近的一个父节点, 
        // 于是我们记录下来, 作为最近父节点（离起点）, 用于之后回溯道路
        prev[nx][ny] = current;
        // 设置成已经访问过, 防止之后最近父节点被后来的父节点覆盖
        visited[nx][ny] = true; 
        queue.push({ x: nx, y: ny });
      }
    }
  }

  // 回溯路径
  const path: Position[] = [];
  let cur: Position | null = end;
  if (!visited[end.x]?.[end.y]) {
    return [];
  }
  while (cur) {
    path.push(cur);
    cur = prev[cur.x][cur.y];
  }
  // 倒转， 得到从起点到终点的最短的路径
  return path.reverse();
};
