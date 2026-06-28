import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import WizardStepper from '../components/register-upps/WizardStepper';
import Step1Profile from '../components/register-upps/Step1Profile';
import Step2Prodi from '../components/register-upps/Step2Prodi';
import Step3Documents from '../components/register-upps/Step3Documents';
import RegistrationSuccess from '../components/register-upps/RegistrationSuccess';
import { getReferenceData, submitRegistration, getRequestByToken, resubmitRegistration } from '../services/registration';

const EMPTY_FORM = {
  uppsName: '', highestLeaderName: '', accountPjName: '', email: '', phone: '',
  institutionId: '', username: '', password: '', confirmPassword: '',
  prodiList: [{ jenjangCode: '', programStudiId: '', ketuaProdi: '', letakProdi: '' }],
  documents: {
    surat_permohonan_akun: null,
    surat_pernyataan_upps: null,
  },
};

export default function RegisterUPPSPage() {
  const [params] = useSearchParams();
  const resubmitToken = params.get('resubmit');

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [reference, setReference] = useState({ institutions: [], programStudi: [], jenjang: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [resubmittingRequestId, setResubmittingRequestId] = useState(null);

  useEffect(() => {
    getReferenceData().then(setReference).catch(console.error);
  }, []);

  useEffect(() => {
    if (resubmitToken) {
      getRequestByToken(resubmitToken)
        .then((data) => {
          setResubmittingRequestId(data.id);
          setFormData({
            uppsName: data.upps_name,
            highestLeaderName: data.highest_leader_name,
            accountPjName: data.account_pj_name,
            email: data.email,
            phone: data.phone || '',
            institutionId: data.institution_id,
            username: data.username,
            password: '',
            confirmPassword: '',
            prodiList: data.prodi.map((p) => ({
              jenjangCode: p.jenjang_code,
              programStudiId: p.program_studi_id,
              ketuaProdi: p.ketua_prodi,
              letakProdi: p.letak_prodi || '',
            })),
            documents: { surat_permohonan_akun: null, surat_pernyataan_upps: null },
          });
        })
        .catch(() => setError('Token resubmit tidak valid atau kadaluarsa.'));
    }
  }, [resubmitToken]);

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('uppsName', formData.uppsName);
    fd.append('highestLeaderName', formData.highestLeaderName);
    fd.append('accountPjName', formData.accountPjName);
    fd.append('email', formData.email);
    fd.append('phone', formData.phone);
    fd.append('institutionId', formData.institutionId);
    fd.append('username', formData.username);
    if (formData.password) fd.append('password', formData.password);
    fd.append('prodiList', JSON.stringify(formData.prodiList));
    fd.append('surat_permohonan', formData.documents.surat_permohonan_akun);
    fd.append('surat_pernyataan', formData.documents.surat_pernyataan_upps);
    if (resubmitToken) fd.append('token', resubmitToken);
    return fd;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = resubmittingRequestId
        ? await resubmitRegistration(resubmittingRequestId, buildFormData())
        : await submitRegistration(buildFormData());
      setSuccess(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return <RegistrationSuccess result={success} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-50 via-indigo-50/20 to-slate-100 p-4 overflow-hidden select-none">
      {/* Decorative gradient spheres */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl glass-panel-light rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden relative z-10 my-8">
        <div className="p-7">
          {/* Branding header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100/50 shadow-sm mb-3">
              <Shield className="w-7 h-7 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {resubmittingRequestId ? 'Resubmit Pendaftaran' : 'Registrasi UPPS'}
            </h1>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">Sistem Akreditasi Blockchain & AI LAM-TEK 2025</p>
          </div>

          {/* Back to login */}
          <div className="text-center mb-4">
            <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Kembali ke Login
            </Link>
          </div>

          <WizardStepper currentStep={step} />

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-semibold animate-fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {step === 1 && (
            <Step1Profile
              formData={formData}
              setFormData={setFormData}
              institutions={reference.institutions}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2Prodi
              formData={formData}
              setFormData={setFormData}
              jenjang={reference.jenjang}
              programStudi={reference.programStudi}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3Documents
              formData={formData}
              setFormData={setFormData}
              onBack={() => setStep(2)}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}

          <p className="text-center text-[11px] text-slate-500 mt-6">
            Dengan mendaftar, Anda menyetujui ketentuan & syarat yang berlaku di LAM Teknik Indonesia.
          </p>
        </div>
      </div>
    </div>
  );
}
