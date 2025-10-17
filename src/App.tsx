import { Canvas } from './components/Canvas/Canvas';
import { HistoryToast } from './components/History/HistoryToast';
import { TopBar } from './components/TopBar/TopBar';

const App = () => {
  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-100">
      <TopBar />
      <main className="flex-1 overflow-hidden">
        <Canvas />
      </main>
      <HistoryToast />
    </div>
  );
};

export default App;
