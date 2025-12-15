import MazeGame from './components/MazeGame';

/**
 * 主页面组件
 */
export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20">
      <main className="flex flex-col items-center justify-center min-h-screen">
        <MazeGame />
      </main>
    </div>
  );
}
