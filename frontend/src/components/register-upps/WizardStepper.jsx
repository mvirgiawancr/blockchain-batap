import { Check } from 'lucide-react';

const STEPS = [
  { num: 1, label: 'Profil UPPS' },
  { num: 2, label: 'Jenjang & Prodi' },
  { num: 3, label: 'Dokumen' },
];

export default function WizardStepper({ currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {STEPS.map((s, idx) => (
        <div key={s.num} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-200
              ${currentStep > s.num
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100'
                : currentStep === s.num
                ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md shadow-indigo-200'
                : 'bg-slate-200 text-slate-500'}`}>
              {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-[11px] font-bold mt-1.5 transition-colors
              ${currentStep >= s.num ? 'text-slate-800' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 -mt-5 rounded-full transition-all duration-200
              ${currentStep > s.num ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
