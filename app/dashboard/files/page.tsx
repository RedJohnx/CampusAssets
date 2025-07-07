"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UploadResult = {
  success: boolean;
  error?: string;
  data?: {
    format_type?: string;
    success_count?: number;
    error_count?: number;
    errors?: string[];
  };
};

const ImportExportPage = () => {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  // Backend URL configuration
  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://znlm131v-5000.inc1.devtunnels.ms";

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, fileType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0], fileType);
    }
  };

  const onFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: string
  ) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0], fileType);
    }
  };

  const handleFileUpload = async (file: File, fileType: string) => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use your hosted backend URL
      const endpoint =
        fileType === "csv"
          ? `${BACKEND_URL}/api/upload-csv`
          : `${BACKEND_URL}/api/upload-excel`;

      console.log("Calling endpoint:", endpoint); // Debug log
      console.log("File details:", {
        name: file.name,
        type: file.type,
        size: file.size,
      }); // Debug log

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_token")}`,
        },
        body: formData,
      });

      console.log("Response status:", response.status); // Debug log
      console.log("Response headers:", response.headers.get("content-type")); // Debug log

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(
          `Server returned ${response.status}: Expected JSON but got ${
            contentType || "unknown content type"
          }`
        );
      }

      const result = await response.json();
      console.log("Upload result:", result); // Debug log
      setUploadResult(result);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadResult({
        success: false,
        error:
          "Upload failed: " +
          (error && typeof error === "object" && "message" in error
            ? (error as { message?: string }).message
            : String(error)),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/export-${format}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_token")}`,
        },
      });

      console.log("Export response status:", response.status); // Debug log

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `resources_export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          alert("Export failed: " + error.error);
        } else {
          alert(`Export failed: Server returned ${response.status}`);
        }
      }
    } catch (error) {
      console.error("Export error:", error);
      alert(
        "Export failed: " +
          (error && typeof error === "object" && "message" in error
            ? (error as { message?: string }).message
            : String(error))
      );
    }
  };

  const getFormatInfo = (formatType: string) => {
    if (formatType === "special_multi_section") {
      return {
        type: "info",
        title: "Special Multi-Section Format Detected",
        description:
          "Successfully processed Excel file with multiple laboratory sections and location headers.",
      };
    } else if (formatType === "standard_tabular") {
      return {
        type: "success",
        title: "Standard Format Processed",
        description: "Excel file processed using standard tabular format.",
      };
    }
    return null;
  };

  const resetFileInputs = () => {
    if (csvInputRef.current) csvInputRef.current.value = "";
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Import and Export Resource Data
        </h1>
        <p className="text-gray-600">
          Upload CSV/Excel files or download your resource data
        </p>
        <p className="text-sm text-gray-500 mt-2">Backend: {BACKEND_URL}</p>
      </div>

      {/* Import Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* CSV Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CSV Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, "csv")}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Click to select a CSV file or drag and drop
              </p>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => onFileSelect(e, "csv")}
                className="hidden"
              />
              <Button
                onClick={() => csvInputRef.current?.click()}
                disabled={isUploading}
                className="mb-4"
              >
                {isUploading ? "Uploading..." : "Select CSV File"}
              </Button>

              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-medium">Required columns:</p>
                <p>
                  SL No, Description, Service Tag, Identification Number,
                  Procurement Date, Cost, Location, Department
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Excel Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Excel Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, "excel")}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Click to select an Excel file or drag and drop
              </p>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => onFileSelect(e, "excel")}
                className="hidden"
              />
              <Button
                onClick={() => excelInputRef.current?.click()}
                disabled={isUploading}
                className="mb-4"
              >
                {isUploading ? "Uploading..." : "Select Excel File"}
              </Button>

              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-medium">Supported formats:</p>
                <p>.xlsx, .xls with standard tabular structure</p>
                <p className="font-medium text-blue-600">
                  Special Format Support:
                </p>
                <p>
                  Multi-section Excel files with location headers and repeated
                  table structures
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <Card>
          <CardContent className="pt-6">
            {uploadResult.success ? (
              <div className="space-y-4">
                {/* Format Detection Info */}
                {uploadResult.data?.format_type && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {
                        getFormatInfo(uploadResult.data.format_type)
                          ?.description
                      }
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success Message */}
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>✅ Successfully processed:</strong>{" "}
                    {uploadResult.data?.success_count || 0} records
                  </AlertDescription>
                </Alert>

                {/* Error Summary */}
                {(uploadResult.data?.error_count ?? 0) > 0 && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>❌ Errors:</strong>{" "}
                      {uploadResult.data?.error_count ?? 0} records
                      {uploadResult.data && uploadResult.data.errors && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium">
                            View error details
                          </summary>
                          <div className="mt-2 text-sm">
                            {uploadResult.data.errors
                              .slice(0, 5)
                              .map((error, index) => (
                                <div key={index} className="text-red-600">
                                  • {error}
                                </div>
                              ))}
                            {uploadResult.data.errors.length > 5 && (
                              <div className="text-gray-600">
                                ... and {uploadResult.data.errors.length - 5}{" "}
                                more
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Reset Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadResult(null);
                      resetFileInputs();
                    }}
                  >
                    Upload Another File
                  </Button>
                </div>
              </div>
            ) : (
              <Alert className="border-red-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Upload Successful:</strong> {uploadResult.error}
                  {uploadResult.data?.errors && (
                    <details className="mt-2"></details>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-center p-6 border rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h3 className="font-medium mb-2">CSV Export</h3>
              <p className="text-sm text-gray-600 mb-4">
                Download all resources in CSV format for spreadsheet
                applications
              </p>
              <Button onClick={() => handleExport("csv")} variant="outline">
                Download CSV
              </Button>
            </div>

            <div className="text-center p-6 border rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="font-medium mb-2">Excel Export</h3>
              <p className="text-sm text-gray-600 mb-4">
                Download all resources in Excel format with formatting
              </p>
              <Button onClick={() => handleExport("excel")} variant="outline">
                Download Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>File Format Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-green-600 mb-2">
                ✅ Supported Excel Formats:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Standard tabular format (.xlsx, .xls)</li>
                <li>• Multi-section format with location headers</li>
                <li>
                  • Department inventory sheets with repeated table structures
                </li>
                <li>
                  • Files with header information and multiple laboratory
                  sections
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-600 mb-2">
                📋 Required Data Fields:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• SL No (Serial Number)</li>
                <li>• Description (Item description)</li>
                <li>• Service Tag (Unique identifier)</li>
                <li>• Identification Number</li>
                <li>• Procurement Date</li>
                <li>• Cost (Numeric value)</li>
                <li>• Location</li>
                <li>• Department</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-purple-600 mb-2">
                🔧 Special Format Handling:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Automatically detects multi-section Excel files</li>
                <li>• Extracts location information from section headers</li>
                <li>• Handles repeated table structures</li>
                <li>• Ignores summary rows and blank sections</li>
                <li>• Maps flexible column names and variations</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-orange-600 mb-2">
                🐛 Debugging Features:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Console logging for API calls and responses</li>
                <li>• Content-type validation before JSON parsing</li>
                <li>• Detailed error messages with response status</li>
                <li>• Backend URL display for verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportExportPage;
