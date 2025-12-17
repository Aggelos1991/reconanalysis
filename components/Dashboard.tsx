import React, { useState } from 'react';
import { ReconciliationState, MatchResult, NormalizedRow } from '../types';
import { CheckCircle, AlertTriangle, HelpCircle, Database, ArrowRight, Zap, Layers, GitCommit, Check, Search, FileX, BarChart3, ListFilter } from 'lucide-react';
import { convertToDbRecords, saveRecords, getRecords } from '../services/dbService';

interface DashboardProps {
  data: ReconciliationState;
  onSwitchToDb: () => void;
}

const StatCard: React.FC<{ 
  title: string; 
  count: number; 
  sum?: number; 
  color: string; 
  icon: React.ReactNode 
}> = ({ title, count, sum, color, icon }) => (
  <div className={`bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all duration-300`}>
    <div className={`absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity text-${color}-400`}>
      {icon}
    </div>
    <div className="flex flex-col h-full justify-between relative z-10">
      <h4 className={`text-${color}-400 text-[10px] font-bold uppercase tracking-widest mb-1`}>{title}</h4>
      <div>
        <div className="text-3xl font-bold text-white mb-1 tracking-tight">{count}</div>
        {sum !== undefined && (
          <div className="text-xs text-slate-400 font-mono">
            {sum.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
          </div>
        )}
      </div>
    </div>
  </div>
);

// --- New Unified Match Table ---
const MatchAnalysisTable = ({ matches, type }: { matches: MatchResult[], type: 'perfect' | 'diff' | 'fuzzy' }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = matches.filter(m => 
    m.erpInvoice.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.vendorInvoice.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.difference.toString().includes(searchTerm)
  );

  let headerColor = '';
  let rowColor = '';
  
  if (type === 'perfect') { headerColor = 'text-emerald-400'; rowColor = 'text-emerald-300'; }
  else if (type === 'diff') { headerColor = 'text-amber-400'; rowColor = 'text-amber-300'; }
  else { headerColor = 'text-purple-400'; rowColor = 'text-purple-300'; }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
           <input 
             type="text" 
             placeholder="Filter matches..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-slate-600"
           />
        </div>
        <div className="text-xs font-mono text-slate-500">
          Showing {filtered.length} of {matches.length}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto max-h-[400px]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-950/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
            <tr>
               <th className="px-6 py-3 border-b border-slate-800">ERP Invoice</th>
               <th className="px-6 py-3 border-b border-slate-800">Vendor Invoice</th>
               <th className="px-6 py-3 border-b border-slate-800 text-right">ERP Amt</th>
               <th className="px-6 py-3 border-b border-slate-800 text-right">Vendor Amt</th>
               <th className="px-6 py-3 border-b border-slate-800 text-right">Difference</th>
               {type === 'fuzzy' && <th className="px-6 py-3 border-b border-slate-800 text-right">Similarity</th>}
               {type === 'fuzzy' && <th className="px-6 py-3 border-b border-slate-800 text-right">Type</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
             {filtered.map((m, idx) => (
               <tr key={`${m.erpId}-${idx}`} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-2 font-mono text-xs text-slate-300">{m.erpInvoice}</td>
                  <td className="px-6 py-2 font-mono text-xs text-slate-300">{m.vendorInvoice}</td>
                  <td className="px-6 py-2 font-mono text-xs text-right text-slate-400">{m.erpAmount.toFixed(2)}</td>
                  <td className="px-6 py-2 font-mono text-xs text-right text-slate-400">{m.vendorAmount.toFixed(2)}</td>
                  <td className={`px-6 py-2 font-mono text-xs text-right font-bold ${m.difference === 0 ? 'text-slate-600' : rowColor}`}>
                    {m.difference.toFixed(2)}
                  </td>
                  {type === 'fuzzy' && <td className="px-6 py-2 font-mono text-xs text-right text-slate-500">{Math.round((m.similarity || 0)*100)}%</td>}
                  {type === 'fuzzy' && <td className="px-6 py-2 font-mono text-xs text-right text-purple-400">{m.status}</td>}
               </tr>
             ))}
             {filtered.length === 0 && (
               <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-600 text-xs font-mono">NO RECORDS FOUND</td></tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MissingTable = ({ 
  title, 
  rows, 
  icon, 
  colorClass, 
  headerColor,
  actionButton 
}: { 
  title: string, 
  rows: NormalizedRow[], 
  icon: React.ReactNode, 
  colorClass: string,
  headerColor: string,
  actionButton?: React.ReactNode
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = rows.filter(r => 
    r.invoice.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.amount.toString().includes(searchTerm)
  );

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col h-[500px]">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center">
          <h3 className={`font-bold ${headerColor} flex items-center gap-2 text-sm tracking-wide uppercase`}>
            {icon} {title}
          </h3>
          {actionButton}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
          <input 
            type="text" 
            placeholder="Search missing..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-slate-600"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <table className="w-full text-sm text-left table-auto">
          <thead className="bg-slate-950/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
            <tr>
              <th className="px-6 py-3 border-b border-slate-800 w-1/3">Ref</th>
              <th className="px-6 py-3 border-b border-slate-800 w-1/3">Date</th>
              <th className="px-6 py-3 border-b border-slate-800 text-right w-1/3">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredRows.map((row) => (
              <tr key={row.id} className={`hover:bg-slate-800/30 transition-colors group`}>
                <td className="px-6 py-3 font-medium text-slate-200 group-hover:text-white font-mono text-xs">{row.invoice}</td>
                <td className="px-6 py-3 text-slate-500 font-mono text-xs">{row.date}</td>
                <td className={`px-6 py-3 text-right font-mono font-medium text-sm ${colorClass}`}>
                  {row.amount.toFixed(2)}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-600 font-mono text-xs">
                  NO RECORDS
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ data, onSwitchToDb }) => {
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [activeMatchTab, setActiveMatchTab] = useState<'perfect' | 'diff' | 'fuzzy'>('perfect');

  const handlePushToDb = async () => {
    setPushStatus('loading');
    
    try {
        // 1. Fetch existing records to check for duplicates
        const existingRecords = await getRecords();
        
        // Create a signature set for O(1) lookups
        // Signature: invoice|amount|vendor
        const existingSignatures = new Set(existingRecords.map(r => 
            `${r.invoice.trim().toLowerCase()}|${r.amount.toFixed(2)}|${r.vendorName.trim().toLowerCase()}`
        ));

        // 2. Filter out duplicates from the current missingErp list
        const rowsToAdd = data.missingErp.filter(r => {
            const sig = `${r.invoice.trim().toLowerCase()}|${r.amount.toFixed(2)}|${r.vendorName.trim().toLowerCase()}`;
            return !existingSignatures.has(sig);
        });

        if (rowsToAdd.length === 0) {
            setPushStatus('idle');
            alert("Action Prevented: All these records already exist in the database.");
            return;
        }

        // 3. Convert and Save only new records
        const records = convertToDbRecords(rowsToAdd);
        await saveRecords(records);
        
        setPushStatus('success');
        
        if (rowsToAdd.length < data.missingErp.length) {
            alert(`Successfully pushed ${rowsToAdd.length} new records.\n${data.missingErp.length - rowsToAdd.length} duplicate records were skipped.`);
        }
        
        setTimeout(() => setPushStatus('idle'), 3000);
    } catch (e) {
        console.error(e);
        setPushStatus('idle');
        alert("Failed to push to database");
    }
  };

  const perfectMatches = data.matches.filter(m => m.status === 'Perfect Match');
  const diffMatches = data.matches.filter(m => m.status === 'Difference Match');
  const fuzzyMatches = data.matches.filter(m => m.status === 'Tier-2' || m.status === 'Tier-3');

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* 1. Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Perfect Matches" 
          count={data.stats.perfectCount} 
          sum={data.stats.perfectSum}
          color="emerald"
          icon={<CheckCircle size={40} />}
        />
        <StatCard 
          title="Differences" 
          count={data.stats.diffCount} 
          sum={data.stats.diffSum}
          color="amber"
          icon={<AlertTriangle size={40} />}
        />
        <StatCard 
          title="Fuzzy Matches" 
          count={data.stats.tier2Count + data.stats.tier3Count} 
          sum={data.stats.tier2Sum + data.stats.tier3Sum}
          color="purple"
          icon={<HelpCircle size={40} />}
        />
        <div className="bg-red-500/10 backdrop-blur-md p-5 rounded-2xl border border-red-500/30 flex flex-col justify-between hover:bg-red-500/20 transition-colors h-full">
          <div className="flex justify-between items-start">
            <h4 className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Action Required</h4>
            <div className="animate-pulse">
               <Database className="text-red-400" size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1 tracking-tight">{data.stats.missingErpCount}</div>
            <div className="text-xs text-red-300 font-mono mb-3">
               MISSING IN ERP ({data.stats.missingErpSum.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })})
            </div>
          </div>
          <button 
            onClick={handlePushToDb}
            disabled={pushStatus !== 'idle' || data.stats.missingErpCount === 0}
            className={`w-full py-2 px-3 rounded text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2
              ${pushStatus === 'success' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                : pushStatus === 'loading'
                ? 'bg-slate-800 text-slate-400 cursor-wait'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'}`}
          >
            {pushStatus === 'success' ? <CheckCircle size={14} /> : pushStatus === 'loading' ? 'Syncing...' : 'Push to DB'}
          </button>
        </div>
      </div>

      {/* 2. Match Analysis Console (Tabbed) */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
        <div className="border-b border-slate-800 bg-slate-950/30 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             <div className="flex items-center gap-2 text-white font-bold tracking-tight">
                 <BarChart3 className="text-cyan-400" size={20} />
                 MATCH ANALYSIS CONSOLE
             </div>
             
             {/* Tabs */}
             <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button 
                    onClick={() => setActiveMatchTab('perfect')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${activeMatchTab === 'perfect' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Perfect <span className="ml-1 opacity-60">({perfectMatches.length})</span>
                </button>
                <button 
                    onClick={() => setActiveMatchTab('diff')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${activeMatchTab === 'diff' ? 'bg-amber-500/20 text-amber-400 shadow-sm border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Differences <span className="ml-1 opacity-60">({diffMatches.length})</span>
                </button>
                <button 
                    onClick={() => setActiveMatchTab('fuzzy')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${activeMatchTab === 'fuzzy' ? 'bg-purple-500/20 text-purple-400 shadow-sm border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Fuzzy/Logic <span className="ml-1 opacity-60">({fuzzyMatches.length})</span>
                </button>
             </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[300px] bg-slate-900/20">
            {activeMatchTab === 'perfect' && <MatchAnalysisTable matches={perfectMatches} type="perfect" />}
            {activeMatchTab === 'diff' && <MatchAnalysisTable matches={diffMatches} type="diff" />}
            {activeMatchTab === 'fuzzy' && <MatchAnalysisTable matches={fuzzyMatches} type="fuzzy" />}
        </div>
      </div>

      {/* 3. Anomalies (Side by Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MissingTable
          title="MISSING IN ERP (Exceptions)"
          rows={data.missingErp}
          icon={<AlertTriangle size={16} className="text-red-500"/>}
          colorClass="text-red-400"
          headerColor="text-red-100"
          actionButton={
            <button onClick={onSwitchToDb} className="text-[10px] flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700 text-cyan-400 font-bold uppercase tracking-wide transition-colors">
              View Database <ArrowRight size={10} />
            </button>
          }
        />
        
        <MissingTable
          title="MISSING IN VENDOR"
          rows={data.missingVendor}
          icon={<FileX size={16} className="text-pink-500"/>}
          colorClass="text-pink-400"
          headerColor="text-pink-100"
        />
      </div>
    </div>
  );
};

export default Dashboard;