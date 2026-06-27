import { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { validateDocument } from '../../services/registration';

const DOCS = [
  { key: 'surat_permohonan_akun', label: 'Surat Pengajuan Permohonan Akun', hint: 'Format surat diunduh dari template resmi LAM Teknik', template: 'surat_permohonan_akun' },
  { key: 'surat_pernyataan_upps', label: 'Surat Pernyataan sebagai UPPS oleh Pimpinan PT', hint: 'Format surat diunduh dari template resmi LAM Teknik', template: 'surat_pernyataan_upps' },
];

export default function Step3Documents({ formData, setFormData, onBack, onSubmit, submitting }) {
  const [validatingKey, setValidatingKey] = useState(null);
  const [validations, setValidations] = useState({});

  const handleFile = async (docKey, templateCode, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setValidations({ ...validations, [docKey]: { error: 'Hanya file PDF yang diizinkan' } });
      return;
    }
    if (file.size > 1024 * 1024) {
      setValidations({ ...validations, [docKey]: { error: 'Ukuran file melebihi 1 MB' } });
      return;
    }

    setFormData({
      ...formData,
      documents: { ...formData.documents, [docKey]: file },
    });
    setValidatingKey(docKey);
    setValidations({ ...validations, [docKey]: undefined });

    try {
      const result = await validateDocument(templateCode, file);
      setValidations({ ...validations, [docKey]: result });
    } catch (err) {
      setValidations({
        ...validations,
        [docKey]: { error: err.response?.data?.error || 'Validasi gagal. Coba lagi.' },
      });
    } finally {
      setValidatingKey(null);
    }
  };

  const clearFile = (docKey) => {
    setFormData({ ...formData, documents: { ...formData.documents, [docKey]: null } });
    setValidations({ ...validations, [docKey]: undefined });
  };

  const allValid = DOCS.every((d) =>
    formData.documents[d.key] && validations[d.key]?.is_valid
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-slate-800">Upload Dokumen Registrasi</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          PDF maksimal 1 MB. Dokumen akan divalidasi terhadap template resmi LAM Teknik menggunakan AI embedding.
        </p>
      </div>

      {DOCS.map((doc) => {
        const file = formData.documents[doc.key];
        const validation = validations[doc.key];
        const isValidating = validatingKey === doc.key;

        return (
          <div key={doc.key} className={`p-4 border rounded-xl space-y-2 transition-colors
            ${validation?.is_valid ? 'border-emerald-200 bg-emerald-50/30'
              : validation?.error || (validation && !validation.is_valid) ? 'border-rose-200 bg-rose-50/30'
              : 'border-slate-200 bg-white/50'}`}>
            <div>
              <label className="text-xs font-bold text-slate-800">{doc.label} <span className="text-rose-500">*</span></label>
              <p className="text-[10px] text-slate-500 mt-0.5">{doc.hint}</p>
            </div>

            {!file ? (
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-6 cursor-pointer transition-all
                ${validation?.error ? 'border-rose-300 hover:bg-rose-50'
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'}`}>
                <UploadCloud className="w-6 h-6 text-slate-400" />
                <span className="text-[11px] text-slate-500 mt-1.5">Klik untuk upload PDF (maks. 1 MB)</span>
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => handleFile(doc.key, doc.template, e.target.files[0])} />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-white/70 rounded-xl border border-slate-200">
                <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{file.name}</div>
                  <div className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</div>
                </div>
                {isValidating ? (
                  <div className="flex items-center gap-1.5 text-indigo-600 text-[11px] font-bold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memvalidasi...
                  </div>
                ) : validation?.is_valid ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    Valid · {(validation.similarity * 100).toFixed(1)}%
                  </div>
                ) : validation?.error ? (
                  <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-bold">
                    <XCircle className="w-4 h-4" />
                    Error
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-bold">
                    <XCircle className="w-4 h-4" />
                    Similaritas rendah
                  </div>
                )}
                <button type="button" onClick={() => clearFile(doc.key)}
                  className="text-[11px] text-indigo-600 font-bold hover:underline ml-2">
                  Ganti
                </button>
              </div>
            )}

            {validation?.error && (
              <p className="text-[11px] text-rose-600 font-semibold">{validation.error}</p>
            )}
            {validation && !validation.is_valid && !validation.error && (
              <p className="text-[11px] text-rose-600">
                Similaritas dokumen {((validation.similarity || 0) * 100).toFixed(1)}% di bawah threshold {((validation.threshold || 0) * 100).toFixed(0)}%.
                Pastikan dokumen menggunakan template resmi LAM Teknik.
              </p>
            )}
            {validation?.is_valid && (
              <p className="text-[11px] text-emerald-700">
                Dokumen sesuai template resmi.
              </p>
            )}
          </div>
        );
      })}

      <div className="flex justify-between pt-3">
        <button type="button" onClick={onBack}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
          ← Kembali
        </button>
        <button type="button" onClick={onSubmit} disabled={!allValid || submitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition-all duration-200 cursor-pointer shadow-md shadow-emerald-100 hover:shadow-lg hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {submitting ? 'Mengirim...' : 'Daftarkan'}
        </button>
      </div>
    </div>
  );
}
