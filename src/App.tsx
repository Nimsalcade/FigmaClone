import { LayoutDashboard, PanelsTopLeft, Settings2 } from 'lucide-react';

const App = () => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-slate-800 px-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <LayoutDashboard aria-hidden="true" className="h-6 w-6 text-slate-300" />
          <span>Figma Clone</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="hidden items-center gap-2 sm:inline-flex">
            <PanelsTopLeft aria-hidden="true" className="h-4 w-4" />
            Draft workspace
          </span>
          <button
            type="button"
            className="rounded-md border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
          >
            Invite
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 flex-shrink-0 border-r border-slate-800 p-4 sm:flex sm:flex-col">
          <p className="text-sm font-semibold text-slate-300">Layers</p>
          <div className="mt-3 space-y-2 text-xs text-slate-400">
            <p>Document structure placeholder</p>
            <p>Objects will appear here once created.</p>
          </div>
        </aside>
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex h-12 items-center gap-3 border-b border-slate-800 px-4 text-xs text-slate-300">
            <button
              type="button"
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 font-medium hover:border-slate-600"
            >
              Move tool
            </button>
            <button
              type="button"
              className="rounded-md border border-transparent px-3 py-1 hover:border-slate-600 hover:bg-slate-900"
            >
              Shape tool
            </button>
            <button
              type="button"
              className="rounded-md border border-transparent px-3 py-1 hover:border-slate-600 hover:bg-slate-900"
            >
              Text tool
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
            <div className="flex h-full w-full max-w-4xl flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 text-sm text-slate-400">
              Canvas workspace placeholder
            </div>
          </div>
        </main>
        <aside className="w-80 border-l border-slate-800 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-300">
            <span>Properties</span>
            <Settings2 aria-hidden="true" className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-400">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              Object controls placeholder
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              Color and typography controls placeholder
            </div>
          </div>
        </aside>
      </div>
      <footer className="flex h-10 items-center border-t border-slate-800 px-4 text-xs text-slate-500">
        Status bar placeholder
      </footer>
    </div>
  );
};

export default App;
