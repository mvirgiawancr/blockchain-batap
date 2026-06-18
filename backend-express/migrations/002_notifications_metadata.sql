-- Notifikasi: kolom metadata untuk aksi/tombol (mis. download surat tugas / sertifikat)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
