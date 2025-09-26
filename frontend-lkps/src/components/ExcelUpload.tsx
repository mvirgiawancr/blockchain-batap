import React, { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, X, Eye } from "lucide-react";
import { excelParser } from "../utils/excelParser";
import type { ParsedExcelFile, UploadProgress } from "../types/lkps";

interface ExcelUploadProps {
  onFileUploaded?: (data: ParsedExcelFile) => void;
  onClose?: () => void;
  documentType?: "LKPS" | "LED";
}

export const ExcelUpload: React.FC<ExcelUploadProps> = ({
  onFileUploaded,
  onClose,
  documentType = "LKPS",
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcelFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helpers
  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const getProgressColor = (stage: string) => {
    switch (stage) {
      case "completed":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  // Drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  // File input
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  // Selection & parse
  const handleFileSelection = useCallback(
    async (selectedFile: File) => {
      // Validate file format
      const validation = excelParser.validateFileFormat(selectedFile);
      if (!validation.valid) {
        alert(`Error: ${validation.errors.join("\n")}`);
        return;
      }

      setFile(selectedFile);
      setIsProcessing(true);
      setParsedData(null);
      setUploadProgress({ stage: "saving", progress: 0, message: "Mulai memproses..." });

      try {
        const result = await excelParser.parseExcelFile(selectedFile, setUploadProgress);
        setParsedData(result);

        // Auto-trigger callback bila tanpa error
        if (result.errors.length === 0) {
          onFileUploaded?.(result);
        }
      } catch (error) {
        console.error("Error parsing file:", error);
        alert("Terjadi kesalahan saat memproses file");
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileUploaded]
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Upload File {documentType}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* File Upload Area */}
          {!file && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload File Excel {documentType}
              </h3>
              <p className="text-gray-600 mb-4">Drag & drop file Excel atau klik untuk memilih</p>

              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <label
                htmlFor="file-input"
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Pilih File
              </label>

              <p className="text-sm text-gray-500 mt-3">
                Format yang didukung: .xlsx, .xls, .csv (Maksimal 10MB)
              </p>
            </div>
          )}

          {/* File Info */}
          {file && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">{file.name}</h4>
                    <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setParsedData(null);
                    setUploadProgress(null);
                  }}
                  className="text-red-500 hover:text-red-700"
                  disabled={isProcessing}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Progress */}
          {uploadProgress && isProcessing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {getStageIcon(uploadProgress.stage)}
                  <span className="ml-2 font-medium text-gray-900">{uploadProgress.message}</span>
                </div>
                <span className="text-sm text-gray-600">{uploadProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                    uploadProgress.stage
                  )}`}
                  style={{ width: `${uploadProgress.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Results */}
          {parsedData && !isProcessing && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Hasil Parsing</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Sheet</p>
                    <p className="font-medium">{parsedData.sheets.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Errors</p>
                    <p
                      className={`font-medium ${
                        parsedData.errors.length > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {parsedData.errors.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Warnings</p>
                    <p
                      className={`font-medium ${
                        parsedData.warnings.length > 0 ? "text-yellow-600" : "text-green-600"
                      }`}
                    >
                      {parsedData.warnings.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p
                      className={`font-medium ${
                        parsedData.errors.length > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {parsedData.errors.length > 0 ? "Gagal" : "Berhasil"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {parsedData.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Errors ({parsedData.errors.length})
                  </h4>
                  <ul className="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
                    {parsedData.errors.map((error, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="w-1 h-1 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {parsedData.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Warnings ({parsedData.warnings.length})
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1 max-h-40 overflow-y-auto">
                    {parsedData.warnings.map((warning, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="w-1 h-1 bg-yellow-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Preview */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Data {documentType}
                </h4>
                <div className="space-y-3">
                  {parsedData.lkpsData?.namaUniversitas && (
                    <div>
                      <span className="text-sm text-gray-600">Universitas: </span>
                      <span className="font-medium">{parsedData.lkpsData.namaUniversitas}</span>
                    </div>
                  )}
                  {parsedData.lkpsData?.namaProgram && (
                    <div>
                      <span className="text-sm text-gray-600">Program Studi: </span>
                      <span className="font-medium">{parsedData.lkpsData.namaProgram}</span>
                    </div>
                  )}
                  {parsedData.lkpsData?.jenjangnProgram && (
                    <div>
                      <span className="text-sm text-gray-600">Jenjang: </span>
                      <span className="font-medium">{parsedData.lkpsData.jenjangnProgram}</span>
                    </div>
                  )}
                  {parsedData.lkpsData?.akreditasiTerakhir && (
                    <div>
                      <span className="text-sm text-gray-600">Akreditasi: </span>
                      <span className="font-medium">{parsedData.lkpsData.akreditasiTerakhir}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sheets List */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Sheet yang Ditemukan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {parsedData.sheets.map((sheet, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm font-medium">{sheet.sheetName}</span>
                      <span className="text-xs text-gray-600">{sheet.data.length} rows</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {parsedData && !isProcessing && (
          <div className="border-t p-6 flex-shrink-0">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Tutup
              </button>
              {parsedData.errors.length === 0 && (
                <button
                  onClick={() => onFileUploaded?.(parsedData)}
                  className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-md transition-colors"
                >
                  Simpan ke Sistem
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
