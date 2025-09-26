export interface LKPSData {
    // A. Identitas Program Studi
    namaUniversitas: string;
    namaProgram: string;
    jenjangnProgram: string;
    akreditasiTerakhir: string;
    tanggalAkreditasi: string;

    // B. Data Mahasiswa
    mahasiswaBaru: {
        tahun: number;
        jumlah: number;
    }[];

    mahasiswaAktif: {
        tahun: number;
        jumlah: number;
    }[];

    lulusan: {
        tahun: number;
        jumlah: number;
        ipkRataRata: number;
    }[];

    // C. Data Dosen
    dosenTetap: {
        nidn: string;
        nama: string;
        pendidikanTerakhir: string;
        bidangKeahlian: string;
        jabatanAkademik: string;
        sertifikatProfesi: string;
    }[];

    dosenTidakTetap: {
        nama: string;
        pendidikanTerakhir: string;
        bidangKeahlian: string;
        jabatanAkademik: string;
    }[];

    // D. Kurikulum dan Pembelajaran
    kurikulum: {
        matakuliah: string;
        sks: number;
        semester: number;
        jenis: 'wajib' | 'pilihan';
    }[];

    // E. Penelitian dan Pengabdian
    penelitianDosen: {
        tahun: number;
        judul: string;
        sumberDana: string;
        jumlahDana: number;
    }[];

    pengabdianMasyarakat: {
        tahun: number;
        judul: string;
        sumberDana: string;
        jumlahDana: number;
    }[];

    // F. Sarana dan Prasarana
    ruangKuliah: {
        jenis: string;
        jumlah: number;
        kapasitas: number;
        kondisi: 'baik' | 'sedang' | 'rusak';
    }[];

    laboratorium: {
        nama: string;
        luas: number;
        kapasitas: number;
        peralatan: string[];
    }[];

    // G. Keuangan
    pendanaan: {
        tahun: number;
        sumberDana: string;
        jumlah: number;
        peruntukan: string;
    }[];

    // Metadata
    metadata: {
        uploadDate: string;
        uploadedBy: string;
        fileHash: string;
        fileName: string;
        fileSize: number;
    };
}

export interface ExcelSheetData {
    sheetName: string;
    data: any[][];
}

export interface ParsedExcelFile {
    fileName: string;
    fileSize: number;
    sheets: ExcelSheetData[];
    lkpsData: Partial<LKPSData>;
    errors: string[];
    warnings: string[];
}

export interface UploadProgress {
    stage: 'reading' | 'parsing' | 'validating' | 'saving' | 'completed' | 'error';
    progress: number;
    message: string;
}