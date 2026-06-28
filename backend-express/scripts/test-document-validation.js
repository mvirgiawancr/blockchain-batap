/**
 * Smoke test for documentValidationService.
 * Run: node scripts/test-document-validation.js
 */
const path = require('path');
const fs = require('fs').promises;
const documentValidationService = require('../src/services/documentValidationService');

(async () => {
  try {
    console.log('[1/3] Loading template surat_permohonan_akun (will extract + embed)...');
    const tpl = await documentValidationService.loadTemplate('surat_permohonan_akun');
    console.log(`  ✓ Template loaded: ${tpl.name}`);
    console.log(`    Extracted ${tpl.extracted_text.length} chars, hash=${tpl.file_hash?.slice(0, 12)}…`);
    console.log(`    Embedding dim: ${tpl.embedding.length}`);
    console.log(`    Text preview: ${tpl.extracted_text.slice(0, 200).replace(/\s+/g, ' ')}…`);

    console.log('\n[2/3] Loading template surat_pernyataan_upps...');
    const tpl2 = await documentValidationService.loadTemplate('surat_pernyataan_upps');
    console.log(`  ✓ ${tpl2.name}: ${tpl2.extracted_text.length} chars`);

    console.log('\n[3/3] Validating empty buffer (should fail validation)...');
    const result = await documentValidationService.validateDocument({
      fileBuffer: Buffer.from(''),
      fileName: 'empty.pdf',
      templateCode: 'surat_permohonan_akun',
      context: 'smoke_test',
    });
    console.log('  Result:', JSON.stringify(result, null, 2));

    console.log('\n✓ All smoke checks passed.');
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
