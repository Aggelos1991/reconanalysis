import React, { useState, useEffect } from 'react';
import { DatabaseRecord } from '../types';
import { getRecords, updateRecord, clearDatabase, deleteRecord } from '../services/dbService';
import { Search, RefreshCw, Trash2, Database, Terminal, Briefcase, User, CheckCircle, Circle, Lock, Edit2, XCircle } from 'lucide-react';

const DatabaseView: React.FC = () => {
  const [records, setRecords] = useState<DatabaseRecord[]>([]);
  const [filter, setFilter] = useState<'All' | 'Complete' | 'Incomplete'>('All');
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Track which rows are currently editable
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());

  const fetchRecords = async () => {
    setLoading(true);
    try {
        const data = await getRecords();
        // Sort by date added desc
        setRecords(data.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()));
    } catch (error) {
        console.error("Failed to load DB", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Complete' ? 'Incomplete' : 'Complete';
    // Optimistic update
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    await updateRecord(id, { status: newStatus as any });
  };

  const handleCommentChange = async (id: string, comment: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, comments: comment } : r));
    // Direct update for local DB
    await updateRecord(id, { comments: comment });
  };

  const handleDeleteRow = async (id: string) => {
    if(window.confirm("Are you sure you want to delete this record?")) {
        try {
            await deleteRecord(id);
            // Only remove from UI if DB op succeeded
            setRecords(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            alert("Failed to delete record.");
            console.error(e);
        }
    }
  };

  const toggleEditMode = (id: string) => {
    const newSet = new Set(editingIds);
    if (newSet.has(id)) {
        newSet.delete(id); // Lock it
    } else {
        newSet.add(id); // Unlock it
    }
    setEditingIds(newSet);
  };

  const handleClear = async () => {
    if(window.confirm("WARNING: This will permanently DELETE ALL records from the database. This action cannot be undone. Proceed?")) {
        try {
            await clearDatabase();
            await fetchRecords(); // Fetch fresh empty state
        } catch (e) {
            alert("Failed to clear database.");
            console.error(e);
        }
    }
  }

  // Helper: Wildcard Matcher
  const matchesWildcard = (text: string, filterVal: string) => {
    if (!filterVal) return true;
    const t = (text || '').toLowerCase();
    const f = filterVal.toLowerCase();

    if (!f.includes('*')) {
      return t.includes(f);
    }

    const escapeRegex = (str: string) => str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const pattern = f.split('*').map(escapeRegex).join('.*');
    
    try {
      const re = new RegExp(`^${pattern}$`);
      return re.test(t);
    } catch {
      return false;
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesStatus = filter === 'All' || r.status === filter;
    const matchesSearch = r.invoice.toLowerCase().includes(search.toLowerCase()) || 
                          r.amount.toString().includes(search);
    
    const matchesEntity = matchesWildcard(r.entity, entityFilter);
    const matchesVendor = matchesWildcard(r.vendorName, vendorFilter);
    
    return matchesStatus && matchesSearch && matchesEntity && matchesVendor;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
            <Database className="text-cyan-400" /> LIVE DATABASE
          </h2>
          <div className="flex items-center gap-4 mt-1">
             <p className="text-slate-400 text-sm font-light">
                Secure persistent storage.
             </p>
             <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                {records.length} RECORDS
             </span>
          </div>
        </div>
        <div className="flex gap-3">
            <button type="button" onClick={fetchRecords} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 bg-slate-900/50 backdrop-blur rounded-lg border border-slate-700 transition-all" title="Refresh Data">
                <RefreshCw size={20} />
            </button>
            <button type="button" onClick={handleClear} className="p-3 text-red-500 hover:text-white hover:bg-red-600 bg-slate-900/50 backdrop-blur rounded-lg border border-red-900/50 transition-all" title="Purge Database">
                <Trash2 size={20} />
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center shadow-lg">
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          {['All', 'Incomplete', 'Complete'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                filter === f 
                  ? 'bg-slate-800 text-cyan-400 shadow-lg border border-slate-700' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            <div className="relative group flex-1 md:flex-none md:w-40">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-400 transition-colors" size={14} />
                <input 
                    type="text" 
                    placeholder="Entity (*)..." 
                    value={entityFilter}
                    onChange={(e) => setEntityFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 text-xs placeholder-slate-600 transition-all"
                />
            </div>
            <div className="relative group flex-1 md:flex-none md:w-40">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={14} />
                <input 
                    type="text" 
                    placeholder="Vendor (*)..." 
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-xs placeholder-slate-600 transition-all"
                />
            </div>
            <div className="relative group flex-1 md:flex-none md:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 text-white rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 text-xs placeholder-slate-600 transition-all"
                />
            </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
        {loading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-slate-500 font-mono text-sm tracking-widest">ACCESSING INDEXED DB...</div>
            </div>
        ) : (
            <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                    <th className="px-6 py-4 w-24">Status</th>
                    <th className="px-6 py-4">Invoice ID</th>
                    <th className="px-6 py-4">Entity</th>
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4 text-right">Value</th>
                    <th className="px-6 py-4 w-full">Annotation</th>
                    <th className="px-4 py-4 w-10"></th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                {filteredRecords.map((rec) => (
                    <tr key={rec.id} className={`group hover:bg-slate-800/40 transition-colors ${rec.status === 'Complete' ? 'opacity-50 hover:opacity-100' : ''}`}>
                    <td className="px-6 py-4">
                        <button 
                        type="button"
                        onClick={() => handleStatusToggle(rec.id, rec.status)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border
                            ${rec.status === 'Complete' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'}`}
                        >
                        {rec.status === 'Complete' ? <CheckCircle size={12} /> : <Circle size={12} />}
                        {rec.status === 'Complete' ? 'DONE' : 'OPEN'}
                        </button>
                    </td>
                    <td className={`px-6 py-4 font-mono ${rec.status === 'Complete' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                        {rec.invoice}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{rec.entity}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs max-w-[200px] truncate" title={rec.vendorName}>{rec.vendorName}</td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-cyan-300">
                        {rec.amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            {editingIds.has(rec.id) ? (
                                <div className="relative group/input flex-1 min-w-[200px]">
                                    <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500 transition-colors" size={12} />
                                    <input 
                                        type="text"
                                        autoFocus
                                        value={rec.comments || ''}
                                        onChange={(e) => handleCommentChange(rec.id, e.target.value)}
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') toggleEditMode(rec.id);
                                        }}
                                        placeholder="Add mission notes..."
                                        className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-cyan-500/50 rounded text-xs text-white placeholder-slate-600 transition-all outline-none shadow-[0_0_10px_-3px_rgba(6,182,212,0.3)]"
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 min-w-[200px] py-1.5 px-3 rounded border border-transparent text-xs font-mono">
                                    {rec.comments ? (
                                        <span className="text-slate-300">{rec.comments}</span>
                                    ) : (
                                        <span className="text-slate-700 italic">-- No annotation --</span>
                                    )}
                                </div>
                            )}
                            
                            <button 
                                type="button"
                                onClick={() => toggleEditMode(rec.id)}
                                className={`p-1.5 rounded-md transition-all border ${
                                    editingIds.has(rec.id) 
                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 shadow-sm' 
                                    : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-white hover:bg-slate-700'
                                }`}
                                title={editingIds.has(rec.id) ? "Lock Annotation" : "Unlock to Edit"}
                            >
                                {editingIds.has(rec.id) ? <Lock size={12} /> : <Edit2 size={12} />}
                            </button>
                        </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                        <button 
                            type="button"
                            onClick={() => handleDeleteRow(rec.id)}
                            className="p-1.5 text-slate-600 hover:text-red-500 transition-colors"
                            title="Delete Record"
                        >
                            <XCircle size={14} />
                        </button>
                    </td>
                    </tr>
                ))}
                {filteredRecords.length === 0 && (
                    <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-600">
                            <Database size={32} className="opacity-20" />
                            <span className="font-mono text-sm">NO RECORDS FOUND</span>
                        </div>
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseView;