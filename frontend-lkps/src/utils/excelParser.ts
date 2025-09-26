import * as XLSX from 'xlsx';
import type { ExcelSheetData, ParsedExcelFile, LKPSData, UploadProgress } from '../types/lkps';

export class ExcelParser {
    private static instance: ExcelParser;

    static getInstance(): ExcelParser {
        if (!ExcelParser.instance) {
            ExcelParser.instance = new ExcelParser();
        }
        return ExcelParser.instance;
    }

    async parseExcelFile(
        file: File,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<ParsedExcelFile> {
        const result: ParsedExcelFile = {
            fileName: file.name,
            fileSize: file.size,
            sheets: [],
            lkpsData: {},
            errors: [],
            warnings: []
        };

        try {
            // Stage 1: Reading file
            onProgress?.({
                stage: 'reading',
                progress: 10,
                message: 'Membaca file Excel...'
            });

            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);

            // Stage 2: Parsing sheets
            onProgress?.({
                stage: 'parsing',
                progress: 30,
                message: 'Parsing data Excel...'
            });

            // Parse semua sheet
            workbook.SheetNames.forEach((sheetName, index) => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                result.sheets.push({
                    sheetName,
                    data: jsonData as any[][]
                });

                onProgress?.({
                    stage: 'parsing',
                    progress: 30 + (index / workbook.SheetNames.length) * 40,
                    message: `Parsing sheet: ${sheetName}`
                });
            });

            // Stage 3: Validating and mapping to LKPS structure
            onProgress?.({
                stage: 'validating',
                progress: 70,
                message: 'Validasi dan mapping data LKPS...'
            });

            result.lkpsData = await this.mapToLKPSStructure(result.sheets, result.errors, result.warnings);

            // Stage 4: Final validation
            onProgress?.({
                stage: 'validating',
                progress: 90,
                message: 'Validasi akhir...'
            });

            this.validateLKPSData(result.lkpsData, result.errors, result.warnings);

            onProgress?.({
                stage: 'completed',
                progress: 100,
                message: 'Parsing selesai!'
            });

        } catch (error) {
            result.errors.push(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
            onProgress?.({
                stage: 'error',
                progress: 0,
                message: 'Terjadi kesalahan saat parsing file'
            });
        }

        return result;
    }

    private async mapToLKPSStructure(
        sheets: ExcelSheetData[],
        errors: string[],
        warnings: string[]
    ): Promise<Partial<LKPSData>> {
        const lkpsData: Partial<LKPSData> = {
            metadata: {
                uploadDate: new Date().toISOString(),
                uploadedBy: '', // Will be set by calling component
                fileHash: await this.generateFileHash(sheets),
                fileName: '',
                fileSize: 0
            }
        };

        // Mapping logic berdasarkan nama sheet dan struktur data LKPS
        sheets.forEach(sheet => {
            try {
                switch (true) {
                    case /identitas|program/i.test(sheet.sheetName):
                        this.parseIdentitasProgram(sheet, lkpsData, errors, warnings);
                        break;
                    case /mahasiswa/i.test(sheet.sheetName):
                        this.parseMahasiswaData(sheet, lkpsData, errors, warnings);
                        break;
                    case /dosen/i.test(sheet.sheetName):
                        this.parseDosenData(sheet, lkpsData, errors, warnings);
                        break;
                    case /kurikulum/i.test(sheet.sheetName):
                        this.parseKurikulumData(sheet, lkpsData, errors, warnings);
                        break;
                    case /penelitian/i.test(sheet.sheetName):
                        this.parsePenelitianData(sheet, lkpsData, errors, warnings);
                        break;
                    case /sarana|prasarana/i.test(sheet.sheetName):
                        this.parseSaranaData(sheet, lkpsData, errors, warnings);
                        break;
                    case /keuangan|pendanaan/i.test(sheet.sheetName):
                        this.parseKeuanganData(sheet, lkpsData, errors, warnings);
                        break;
                    default:
                        warnings.push(`Sheet "${sheet.sheetName}" tidak dikenali, akan diabaikan`);
                }
            } catch (error) {
                errors.push(`Error parsing sheet "${sheet.sheetName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });

        return lkpsData;
    }

    private parseIdentitasProgram(sheet: ExcelSheetData, lkpsData: Partial<LKPSData>, _errors: string[], _warnings: string[]) {
        // Implementasi parsing identitas program
        const data = sheet.data;

        // Cari baris yang berisi informasi identitas
        data.forEach((row) => {
            if (Array.isArray(row) && row.length >= 2) {
                const label = String(row[0] || '').toLowerCase();
                const value = String(row[1] || '');

                if (label.includes('nama universitas') || label.includes('perguruan tinggi')) {
                    lkpsData.namaUniversitas = value;
                } else if (label.includes('nama program') || label.includes('program studi')) {
                    lkpsData.namaProgram = value;
                } else if (label.includes('jenjang')) {
                    lkpsData.jenjangnProgram = value;
                } else if (label.includes('akreditasi terakhir')) {
                    lkpsData.akreditasiTerakhir = value;
                } else if (label.includes('tanggal akreditasi')) {
                    lkpsData.tanggalAkreditasi = value;
                }
            }
        });
    }

    private parseMahasiswaData(sheet: ExcelSheetData, _lkpsData: Partial<LKPSData>, _errors: string[], warnings: string[]) {
        // Implementasi parsing data mahasiswa
        const data = sheet.data;
        let headerRowIndex = -1;

        // Cari header row
        data.forEach((row, index) => {
            if (Array.isArray(row)) {
                const rowStr = row.join('').toLowerCase();
                if (rowStr.includes('tahun') && (rowStr.includes('mahasiswa') || rowStr.includes('lulusan'))) {
                    headerRowIndex = index;
                }
            }
        });

        if (headerRowIndex >= 0) {
            // Parse data berdasarkan header yang ditemukan
            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const row = data[i];
                if (Array.isArray(row) && row.length >= 2) {
                    // Implementation depends on actual Excel structure
                    // This is a placeholder
                }
            }
        } else {
            warnings.push(`Tidak dapat menemukan header pada sheet ${sheet.sheetName}`);
        }
    }

    private parseDosenData(_sheet: ExcelSheetData, lkpsData: Partial<LKPSData>, _errors: string[], _warnings: string[]) {
        // Implementasi parsing data dosen
        lkpsData.dosenTetap = [];
        lkpsData.dosenTidakTetap = [];
        // Placeholder implementation
    }

    private parseKurikulumData(_sheet: ExcelSheetData, lkpsData: Partial<LKPSData>, _errors: string[], _warnings: string[]) {
        // Implementasi parsing kurikulum
        lkpsData.kurikulum = [];
        // Placeholder implementation
    }

    private parsePenelitianData(_sheet: ExcelSheetData, lkpsData: Partial<LKPSData>, _errors: string[], _warnings: string[]) {
        // Implementasi parsing penelitian
        lkpsData.penelitianDosen = [];
        lkpsData.pengabdianMasyarakat = [];
        // Placeholder implementation
    }

    private parseSaranaData(_sheet: ExcelSheetData, lkpsData: Partial<LKPSData>, _errors: string[], _warnings: string[]) {
        // Implementasi parsing sarana prasarana
        lkpsData.ruangKuliah = [];
        lkpsData.laboratorium = [];
        // Placeholder implementation
    }

    private parseKeuanganData(_sheet: ExcelSheetData, lkpsData: Partial<LKPSData>, _errors: string[], _warnings: string[]) {
        // Implementasi parsing keuangan
        lkpsData.pendanaan = [];
        // Placeholder implementation
    }

    private validateLKPSData(lkpsData: Partial<LKPSData>, errors: string[], warnings: string[]) {
        // Validasi data LKPS yang sudah di-parse
        if (!lkpsData.namaUniversitas) {
            errors.push('Nama universitas tidak ditemukan');
        }
        if (!lkpsData.namaProgram) {
            errors.push('Nama program studi tidak ditemukan');
        }
        if (!lkpsData.jenjangnProgram) {
            warnings.push('Jenjang program tidak ditemukan');
        }
    }

    private async generateFileHash(sheets: ExcelSheetData[]): Promise<string> {
        // Generate hash dari data sheets untuk integrity checking
        const dataString = JSON.stringify(sheets);
        const encoder = new TextEncoder();
        const data = encoder.encode(dataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    validateFileFormat(file: File): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check file type
        const validTypes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
            errors.push('Format file tidak didukung. Gunakan file .xlsx, .xls, atau .csv');
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            errors.push('Ukuran file terlalu besar. Maksimal 10MB');
        }

        // Check file name
        if (file.name.length > 255) {
            errors.push('Nama file terlalu panjang');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export const excelParser = ExcelParser.getInstance();