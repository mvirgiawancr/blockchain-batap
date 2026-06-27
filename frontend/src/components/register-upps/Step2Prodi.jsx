import { Plus, Trash2, MapPin, User, GraduationCap } from 'lucide-react';

const SELECT_ARROW_BG = "bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_1rem_center] bg-no-repeat";

export default function Step2Prodi({ formData, setFormData, jenjang, programStudi, onBack, onNext }) {
  const updateProdi = (idx, field, value) => {
    const next = [...formData.prodiList];
    next[idx] = { ...next[idx], [field]: value };
    setFormData({ ...formData, prodiList: next });
  };

  const addProdi = () => {
    setFormData({
      ...formData,
      prodiList: [...formData.prodiList, { jenjangCode: '', programStudiId: '', ketuaProdi: '', letakProdi: '' }],
    });
  };

  const removeProdi = (idx) => {
    if (formData.prodiList.length === 1) return;
    const next = formData.prodiList.filter((_, i) => i !== idx);
    setFormData({ ...formData, prodiList: next });
  };

  const validate = () => {
    return formData.prodiList.every((p) =>
      p.jenjangCode && p.programStudiId && p.ketuaProdi?.trim()
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Program Studi yang Dikelola</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Tambahkan minimal 1 program studi. UPPS dapat mengelola beberapa prodi.</p>
        </div>
        <button type="button" onClick={addProdi}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Tambah Prodi
        </button>
      </div>

      {formData.prodiList.map((p, idx) => (
        <div key={idx} className="p-4 border border-slate-200 rounded-xl space-y-3 relative bg-white/50">
          {formData.prodiList.length > 1 && (
            <button type="button" onClick={() => removeProdi(idx)}
              className="absolute top-3 right-3 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              title="Hapus prodi ini">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold">
              {idx + 1}
            </div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Program Studi #{idx + 1}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Jenjang select */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 ml-1">Jenjang <span className="text-rose-500">*</span></label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <GraduationCap className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <select value={p.jenjangCode} onChange={(e) => updateProdi(idx, 'jenjangCode', e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-white/70 border rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 text-sm outline-none cursor-pointer appearance-none ${SELECT_ARROW_BG}
                    ${!p.jenjangCode ? 'border-slate-200' : 'border-indigo-200'}`}>
                  <option value="">-- Pilih Jenjang --</option>
                  {jenjang.map((j) => <option key={j.code} value={j.code}>{j.label}</option>)}
                </select>
              </div>
            </div>

            {/* Program Studi select */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 ml-1">Program Studi <span className="text-rose-500">*</span></label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <GraduationCap className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <select value={p.programStudiId} onChange={(e) => updateProdi(idx, 'programStudiId', e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-white/70 border rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 text-sm outline-none cursor-pointer appearance-none ${SELECT_ARROW_BG}
                    ${!p.programStudiId ? 'border-slate-200' : 'border-indigo-200'}`}>
                  <option value="">-- Pilih Prodi --</option>
                  {programStudi.map((ps) => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Ketua Prodi */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 ml-1">Ketua Prodi <span className="text-rose-500">*</span></label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              </div>
              <input type="text" value={p.ketuaProdi} onChange={(e) => updateProdi(idx, 'ketuaProdi', e.target.value)}
                placeholder="Nama ketua prodi"
                className="block w-full pl-10 pr-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all" />
            </div>
          </div>

          {/* Letak Prodi */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 ml-1">Letak Prodi (alamat / kampus)</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              </div>
              <input type="text" value={p.letakProdi} onChange={(e) => updateProdi(idx, 'letakProdi', e.target.value)}
                placeholder="Jl. ... Kota ..."
                className="block w-full pl-10 pr-3 py-2.5 bg-white/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all" />
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-between pt-3">
        <button type="button" onClick={onBack}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
          ← Kembali
        </button>
        <button type="button" onClick={onNext} disabled={!validate()}
          className="px-6 py-2.5 rounded-xl text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all duration-200 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed">
          Lanjut →
        </button>
      </div>
    </div>
  );
}
