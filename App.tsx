import { useState } from 'react';
import { parseAndNormalize, runReconciliation } from './utils/excelProcessing';
import { ReconciliationState, NormalizedRow } from './types';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import DatabaseView from './components/DatabaseView';
import Background3D from './components/Background3D';
import { FileSpreadsheet, LayoutDashboard, Database as DatabaseIcon, CheckCircle, RotateCcw } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'database'>('upload');
  
  // Data State
  const [erpRows, setErpRows] = useState<NormalizedRow[]>([]);
  const [vendorRows, setVendorRows] = useState<NormalizedRow[]>([]);
  const [results, setResults] = useState<ReconciliationState | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleErpUpload = (data: any[]) => {
    const normalized = parseAndNormalize(data, 'ERP');
    setErpRows(normalized);
  };

  const handleVendorUpload = (data: any[]) => {
    const normalized = parseAndNormalize(data, 'VENDOR');
    setVendorRows(normalized);
  };

  const handleRunRecon = () => {
    setIsProcessing(true);
    // Use timeout to allow UI to render spinner
    setTimeout(() => {
      const res = runReconciliation(erpRows, vendorRows);
      setResults(res);
      setIsProcessing(false);
      setActiveTab('dashboard');
    }, 500);
  };

  const handleResetApp = () => {
      // Use window.location.reload() for a hard reset of the application state
      // This ensures all memory is cleared while preserving IndexedDB
      if(window.confirm("Start a new session? This will clear current uploads (Database will remain safe).")) {
          window.location.reload();
      }
  };

  return (
    <div className="min-h-screen font-sans text-slate-100 relative overflow-hidden selection:bg-cyan-500 selection:text-white">
      <Background3D />
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-cyan-500/20">
                <LayoutDashboard size={24} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  RECON<span className="text-cyan-400">RAPTOR</span>
                </h1>
                <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">Mission Control • Live</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
                <nav className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                    ${activeTab === 'upload' 
                        ? 'bg-slate-800 text-cyan-400 shadow-lg shadow-black/20 border border-slate-700' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                >
                    <FileSpreadsheet size={16} /> Data Link
                </button>
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    disabled={!results}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                    ${activeTab === 'dashboard' 
                        ? 'bg-slate-800 text-cyan-400 shadow-lg shadow-black/20 border border-slate-700' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent'}`}
                >
                    <LayoutDashboard size={16} /> Telemetry
                </button>
                <button 
                    onClick={() => setActiveTab('database')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                    ${activeTab === 'database' 
                        ? 'bg-slate-800 text-cyan-400 shadow-lg shadow-black/20 border border-slate-700' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                >
                    <DatabaseIcon size={16} /> Database
                </button>
                </nav>

                <div className="h-8 w-px bg-slate-800 mx-1"></div>

                <button 
                    type="button"
                    onClick={handleResetApp}
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 border border-transparent rounded-lg transition-all"
                    title="New Session (Reset)"
                >
                    <RotateCcw size={20} />
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        
        {activeTab === 'upload' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-fade-in mt-10">
            <div className="text-center space-y-3">
              <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-slate-400 tracking-tight">
                Initiate Sequence
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
                Upload mission-critical financial data for automated reconciliation analysis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <FileUpload 
                  label="ERP Export" 
                  onDataLoaded={handleErpUpload} 
                  color="cyan"
                />
                <div className="text-sm text-center h-6">
                    {erpRows.length > 0 ? (
                        <span className="text-cyan-400 font-medium flex justify-center items-center gap-2 animate-pulse">
                            <CheckCircle size={14}/> {erpRows.length} RECORDS LOCKED
                        </span>
                    ) : <span className="text-slate-600 font-mono text-xs tracking-wider">WAITING FOR INPUT...</span>}
                </div>
              </div>

              <div className="space-y-4">
                <FileUpload 
                  label="Vendor Statement" 
                  onDataLoaded={handleVendorUpload} 
                  color="blue"
                />
                <div className="text-sm text-center h-6">
                    {vendorRows.length > 0 ? (
                        <span className="text-cyan-400 font-medium flex justify-center items-center gap-2 animate-pulse">
                             <CheckCircle size={14}/> {vendorRows.length} RECORDS LOCKED
                        </span>
                    ) : <span className="text-slate-600 font-mono text-xs tracking-wider">WAITING FOR INPUT...</span>}
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-12">
              <button
                onClick={handleRunRecon}
                disabled={erpRows.length === 0 || vendorRows.length === 0 || isProcessing}
                className={`relative group px-12 py-4 rounded-xl font-bold text-lg tracking-wider transition-all duration-300 overflow-hidden
                  ${(erpRows.length === 0 || vendorRows.length === 0) 
                    ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-800' 
                    : 'bg-white text-black hover:scale-105 shadow-[0_0_40px_-10px_rgba(34,211,238,0.6)]'}`}
              >
                 {isProcessing ? (
                   <span className="flex items-center gap-2">
                     <span className="w-4 h-4 border-2 border-slate-400 border-t-black rounded-full animate-spin"></span>
                     PROCESSING...
                   </span>
                 ) : (
                   <span className="flex items-center gap-2">
                     LAUNCH RECONCILIATION
                   </span>
                 )}
                 {/* Shine effect */}
                 {!(erpRows.length === 0 || vendorRows.length === 0) && (
                   <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[30deg] group-hover:animate-[shine_1s_ease-in-out_infinite]" />
                 )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && results && (
          <Dashboard 
            data={results} 
            onSwitchToDb={() => setActiveTab('database')} 
          />
        )}

        {activeTab === 'database' && (
          <DatabaseView />
        )}
        
      </main>
    </div>
  );
}

export default App;