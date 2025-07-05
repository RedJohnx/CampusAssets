"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FilesPage() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File, type: "csv" | "excel") => {
    const token = localStorage.getItem("session_token");
    if (!token) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(
        `https://znlm131v-5000.inc1.devtunnels.ms/api/upload/${type}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          data: data.data,
          message: data.message,
        });
        toast({
          title: "Upload successful!",
          description: `${data.data.success_count} records processed successfully`,
        });
      } else {
        setUploadResult({
          success: false,
          error: data.error,
          data: data.data,
        });
        toast({
          title: "Upload failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        error: "Network error occurred",
      });
      toast({
        title: "Upload failed",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadResult(null);
      }, 5000);
    }
  };

  const handleExport = async (format: "csv" | "excel", filters: any = {}) => {
    const token = localStorage.getItem("session_token");
    if (!token) return;

    setIsExporting(true);

    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(
        `https://znlm131v-5000.inc1.devtunnels.ms/api/export/${format}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `resources_export_${Date.now()}.${
          format === "csv" ? "csv" : "xlsx"
        }`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Export successful!",
          description: `Resources exported as ${format.toUpperCase()}`,
        });
      } else {
        const data = await response.json();
        toast({
          title: "Export failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const onFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "csv" | "excel"
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">File Management</h1>
        <p className="text-gray-600">Import and export your resource data</p>
      </div>

      {/* Upload Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              CSV Upload
            </CardTitle>
            <CardDescription>
              Upload resources from a CSV file. Ensure your file has the
              required columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Click to select a CSV file or drag and drop
              </p>
              <Button
                onClick={() => csvInputRef.current?.click()}
                disabled={isUploading}
                className="mb-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Select CSV File"
                )}
              </Button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => onFileSelect(e, "csv")}
                className="hidden"
              />
            </div>

            <div className="text-xs text-gray-500">
              <p className="font-medium mb-1">Required columns:</p>
              <p>
                SL No, Description, Service Tag, Identification Number,
                Procurement Date, Cost, Location, Department
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileSpreadsheet className="mr-2 h-5 w-5" />
              Excel Upload
            </CardTitle>
            <CardDescription>
              Upload resources from an Excel file (.xlsx or .xls format).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Click to select an Excel file or drag and drop
              </p>
              <Button
                onClick={() => excelInputRef.current?.click()}
                disabled={isUploading}
                className="mb-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Select Excel File"
                )}
              </Button>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => onFileSelect(e, "excel")}
                className="hidden"
              />
            </div>

            <div className="text-xs text-gray-500">
              <p className="font-medium mb-1">Supported formats:</p>
              <p>.xlsx, .xls with the same column structure as CSV</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <Alert variant={uploadResult.success ? "default" : "destructive"}>
          {uploadResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {uploadResult.success ? (
              <div>
                <p className="font-medium">{uploadResult.message}</p>
                {uploadResult.data && (
                  <div className="mt-2 space-y-1">
                    <p>
                      ✅ Successfully processed:{" "}
                      {uploadResult.data.success_count} records
                    </p>
                    {uploadResult.data.error_count > 0 && (
                      <p>❌ Errors: {uploadResult.data.error_count} records</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="font-medium">
                  Upload failed: {uploadResult.error}
                </p>
                {uploadResult.data?.errors && (
                  <div className="mt-2">
                    <p className="text-sm">First few errors:</p>
                    <ul className="text-xs mt-1 space-y-1">
                      {uploadResult.data.errors
                        .slice(0, 3)
                        .map((error: string, index: number) => (
                          <li key={index}>• {error}</li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="mr-2 h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download your resource data in various formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-medium">Export as CSV</h4>
              <p className="text-sm text-gray-600">
                Download all resources in CSV format for spreadsheet
                applications
              </p>
              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Export CSV
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Export as Excel</h4>
              <p className="text-sm text-gray-600">
                Download all resources in Excel format with formatting
              </p>
              <Button
                variant="outline"
                onClick={() => handleExport("excel")}
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Excel
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle>File Format Guide</CardTitle>
          <CardDescription>
            Guidelines for preparing your import files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Required Columns</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  "SL No",
                  "Description",
                  "Service Tag",
                  "Identification Number",
                  "Procurement Date",
                  "Cost",
                  "Location",
                  "Department",
                ].map((column) => (
                  <Badge
                    key={column}
                    variant="outline"
                    className="justify-center"
                  >
                    {column}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Format Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • Procurement Date: Use YYYY-MM-DD format (e.g., 2024-01-15)
                </li>
                <li>• Cost: Numeric values only (e.g., 1500.50)</li>
                <li>• All required columns must have values</li>
                <li>• File size limit: 10MB</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Tips for Success</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Remove any empty rows at the end of your file</li>
                <li>• Ensure column headers match exactly (case-sensitive)</li>
                <li>• Use consistent formatting throughout the file</li>
                <li>• Test with a small file first</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
