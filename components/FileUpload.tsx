import React, { useRef } from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  label: string;
  onDataLoaded: (data: any[]) => void;
  color?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, onDataLoaded, color = 'blue' }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      onDataLoaded(data);
    };
    reader.readAsBinaryString(file);
  };

  const borderColorClass = color === 'cyan' ? 'border-cyan-500/30 group-hover:border-cyan-400/60' : 'border-blue-500/30 group-hover:border-blue-400/60';
  const iconColorClass = color === 'cyan' ? 'text-cyan-400' : 'text-blue-400';
  const bgHoverClass = color === 'cyan' ? 'group-hover:bg-cyan-500/5' : 'group-hover:bg-blue-500/5';

  return (
    <div 
      onClick={() => inputRef.current?.click()}
      className={`relative border-2 border-dashed ${borderColorClass} bg-slate-900/40 backdrop-blur-sm 
        rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 group overflow-hidden ${bgHoverClass}`}
    >
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
        ref={inputRef}
        onChange={handleFile}
      />
      
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-600 group-hover:border-white transition-colors" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-600 group-hover:border-white transition-colors" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-600 group-hover:border-white transition-colors" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-600 group-hover:border-white transition-colors" />

      <div className={`mx-auto w-16 h-16 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-${color === 'cyan' ? 'cyan-500' : 'blue-500'} transition-all shadow-xl`}>
        <UploadCloud className={`${iconColorClass}`} size={28} />
      </div>
      
      <h3 className="text-lg font-bold text-slate-200 tracking-wide">{label}</h3>
      <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500 uppercase tracking-widest font-semibold">
        <FileSpreadsheet size={12} />
        <span>.XLSX / .CSV Supported</span>
      </div>
    </div>
  );
};

export default FileUpload;