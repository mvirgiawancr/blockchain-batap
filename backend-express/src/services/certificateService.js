const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

/**
 * Certificate Generation Service
 * Generates official accreditation certificates
 */
class CertificateService {
    
    constructor() {
        this.assetsDir = path.join(__dirname, '../../assets'); // Assumes assets folder in root/backend/assets
        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
    }

    /**
     * Generate Accreditation Certificate
     * @param {Object} data Certificate data
     * @param {string} data.submissionId
     * @param {string} data.institutionName
     * @param {string} data.programName
     * @param {string} data.rank (Unggul, Baik Sekali, Baik)
     * @param {string} data.skNumber
     * @param {Date} data.skDate
     * @param {Date} data.validUntil
     * @returns {Promise<Buffer>} PDF Buffer
     */
    async generateCertificatePDF(data) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    layout: 'landscape',
                    size: 'A4',
                    margin: 0
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                // --- Background & Border ---
                // In a real app, load a background image: doc.image('path/to/bg.png', 0, 0, { width: 841.89, height: 595.28 });
                doc.rect(20, 20, 801.89, 555.28).strokeColor('#1d4ed8').lineWidth(5).stroke(); // Blue border
                doc.rect(25, 25, 791.89, 545.28).strokeColor('#fbbf24').lineWidth(2).stroke(); // Gold inner border

                // --- Header ---
                doc.moveDown(2);
                doc.font('Helvetica-Bold').fontSize(24).fillColor('#1e3a8a').text('LEMBAGA AKREDITASI MANDIRI', { align: 'center' });
                doc.fontSize(20).text('PROGRAM STUDI KETEKNIKAN', { align: 'center' });
                doc.moveDown(0.5);
                
                doc.fontSize(12).fillColor('black').text('MENYATAKAN BAHWA', { align: 'center' });
                doc.moveDown(0.5);

                // --- Institution & Program ---
                doc.font('Helvetica-Bold').fontSize(18).text(data.programName.toUpperCase(), { align: 'center' });
                doc.font('Helvetica').fontSize(14).text(`PADA ${data.institutionName.toUpperCase()}`, { align: 'center' });
                doc.moveDown(1);

                // --- Accreditation Status ---
                doc.fontSize(12).text('TERAKREDITASI DENGAN PERINGKAT', { align: 'center' });
                doc.moveDown(0.5);
                
                // Rank Styling
                doc.font('Helvetica-Bold').fontSize(32).fillColor('#b45309'); // Gold/Bronze color
                doc.text(data.rank.toUpperCase(), { align: 'center' });
                
                doc.moveDown(1);

                // --- SK Details ---
                doc.font('Helvetica').fontSize(12).fillColor('black');
                doc.text(`Berdasarkan Surat Keputusan Nomor: ${data.skNumber}`, { align: 'center' });
                doc.text(`Tanggal: ${moment(data.skDate).format('DD MMMM YYYY')}`, { align: 'center' });
                doc.moveDown(0.5);
                doc.text(`Sertifikat ini berlaku sampai dengan tanggal ${moment(data.validUntil).format('DD MMMM YYYY')}`, { align: 'center' });

                // --- Footer / Signatures ---
                doc.moveDown(3);
                
                const yPos = doc.y;
                
                // Left Signature (Ketua Majelis)
                doc.text('Ketua Majelis Akreditasi,', 100, yPos, { align: 'center', width: 200 });
                doc.moveDown(3);
                doc.font('Helvetica-Bold').text('(Nama Ketua Majelis)', 100, doc.y, { align: 'center', width: 200 }); // Placeholder
                
                // Right Signature (Ketua Eksekutif)
                doc.text('Ketua Komite Eksekutif,', 540, yPos, { align: 'center', width: 200 });
                doc.moveDown(3);
                doc.font('Helvetica-Bold').text('(Nama Ketua Eksekutif)', 540, doc.y, { align: 'center', width: 200 }); // Placeholder

                // --- QR Code Placeholder ---
                // doc.image(qrCodeBuffer, 380, yPos, { width: 80 });

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Generate Assignment Letter (Surat Tugas)
     * @param {Object} data Letter data
     * @param {string} data.submissionId
     * @param {string} data.programName
     * @param {string} data.institutionName
     * @param {string} data.letterNumber
     * @param {string} data.letterDate
     * @param {string} data.assessor1Name
     * @param {string} data.assessor2Name
     * @param {string} data.visitDateStart
     * @param {string} data.visitDateEnd
     * @param {string} data.venue
     * @returns {Promise<Buffer>} PDF Buffer
     */
    async generateAssignmentLetterPDF(data) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    layout: 'portrait',
                    size: 'A4',
                    margin: 50
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                // --- Header (Kop Surat) ---
            const logoPath = path.join(this.assetsDir, 'logo_lamtek.png');
            const headerTextX = fs.existsSync(logoPath) ? 120 : 50;
            
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 45, { width: 60 });
            }
            
            doc.font('Helvetica-Bold').fontSize(14).text('LEMBAGA AKREDITASI MANDIRI', headerTextX, 50)
               .text('PROGRAM STUDI KETEKNIKAN', headerTextX, 65)
               .fontSize(10).font('Helvetica').text('Jl. Patra Kuningan XIII No. 1, Kuningan, Jakarta Selatan 12950', headerTextX, 85)
               .text('Telp: (021) 12345678 | Email: sekretariat@lamtek.or.id', headerTextX, 100);
            
            doc.moveTo(50, 120).lineTo(545, 120).stroke();
            doc.moveDown(2);

                // --- Title ---
                doc.font('Helvetica-Bold').fontSize(14).text('SURAT TUGAS', { align: 'center' });
                doc.fontSize(11).font('Helvetica').text(`Nomor: ${data.letterNumber}`, { align: 'center' });
                doc.moveDown(2);

                // --- Body ---
                doc.text('Menimbang bahwa dalam rangka pelaksanaan Asesmen Lapangan untuk Program Studi:', { align: 'justify' });
                doc.moveDown(0.5);
                
                doc.font('Helvetica-Bold').text(`Program Studi: ${data.programName}`);
                doc.text(`Institusi: ${data.institutionName}`);
                doc.moveDown(1);

                doc.font('Helvetica').text('Maka LAM Teknik menugaskan kepada:', { align: 'justify' });
                doc.moveDown(0.5);

                const startY = doc.y;
                doc.text('1.', 70, startY);
                doc.text(`Nama: ${data.assessor1Name}`, 90, startY);
                doc.text('Sebagai: Asesor 1', 90, startY + 15);

                doc.text('2.', 70, startY + 40);
                doc.text(`Nama: ${data.assessor2Name}`, 90, startY + 40);
                doc.text('Sebagai: Asesor 2', 90, startY + 55);

                doc.moveDown(4);
                
                doc.text('Untuk melaksanakan tugas Asesmen Lapangan pada:', { align: 'justify' });
                doc.moveDown(0.5);
                
                doc.text(`Tanggal: ${data.visitDateStart} s.d ${data.visitDateEnd}`, { indent: 20 });
                doc.text(`Tempat: ${data.venue}`, { indent: 20 });
                
                doc.moveDown(2);
                doc.text('Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.', { align: 'justify' });
                doc.moveDown(3);

                // --- Footer (Signature) ---
                const dateStr = moment(data.letterDate).format('D MMMM YYYY');
                doc.text(`Jakarta, ${dateStr}`, 350, doc.y);
                doc.text('Ketua Komite Eksekutif,', 350, doc.y + 15);
                doc.moveDown(4);
                doc.font('Helvetica-Bold').text('(Prof. Dr. Ir. Ketua Eksekutif)', 350, doc.y);
                doc.font('Helvetica').text('NIP. 192837465', 350, doc.y + 5);

                doc.end();

            } catch (error) {
                // If logo not found, fallback to text only header (handled by try-catch usually, but let's be safe for missing asset)
                if (error.code === 'ENOENT') {
                     // Retry without image if image missing logic is complex, or just let it fail and I'll debug.
                     // Ideally I should check fs.existsSync for logo.
                     // For now, let's assume assets exist or just log error.
                     console.error("Asset missing for PDF generation", error);
                     reject(error);
                } else {
                    reject(error);
                }
            }
        });
    }
}

module.exports = new CertificateService();
