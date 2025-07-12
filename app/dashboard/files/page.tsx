"use client";

import type React from "react";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
  Sparkles,
  Zap,
  File,
  Database,
  Cloud,
  FileSpreadsheet,
  Settings,
  Shield,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react"; // Import Building2 component

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
  const [parentDepartment, setParentDepartment] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://campus-back-production.up.railway.app";

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

  const simulateProgress = () => {
    setProcessingProgress(0);
    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return interval;
  };

  const handleFileUpload = async (file: File, fileType: string) => {
    if (!parentDepartment) {
      toast({
        title: "Missing Information",
        description: "Please enter a Parent Department before uploading.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("parent_department", parentDepartment);

      const endpoint =
        fileType === "csv"
          ? `${BACKEND_URL}/api/upload-csv`
          : `${BACKEND_URL}/api/upload-excel`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("session_token")}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      setTimeout(() => {
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          response.text().then((text) => {
            setUploadResult({
              success: false,
              error: `Server returned ${response.status}: ${text}`,
            });
          });
        } else {
          response.json().then((result) => {
            setUploadResult(result);
            if (result.success) {
              toast({
                title: "Upload Successful! 🎉",
                description: `Processed ${
                  result.data?.success_count || 0
                } records successfully.`,
              });
            }
          });
        }
        setProcessingProgress(0);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadResult({
        success: false,
        error: "Upload failed: " + (error as Error).message,
      });
      setProcessingProgress(0);
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
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `resources_export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Export Successful! 📥",
          description: `Your ${format.toUpperCase()} file has been downloaded.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Export Failed",
          description: error.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const getFormatInfo = (formatType: string) => {
    if (
      formatType === "special_multi_section" ||
      formatType === "cleaned_complex"
    ) {
      return {
        description:
          "Successfully processed Excel file with multiple laboratory sections and location headers.",
      };
    } else if (formatType === "standard_tabular" || formatType === "standard") {
      return {
        description: "Excel file processed using standard tabular format.",
      };
    }
    return null;
  };

  const resetFileInputs = () => {
    if (csvInputRef.current) csvInputRef.current.value = "";
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const UniqueLoader = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4"
      >
        <div className="text-center">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: {
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              },
              scale: { duration: 1, repeat: Number.POSITIVE_INFINITY },
            }}
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
          >
            <motion.div
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <Database className="h-10 w-10 text-white" />
            </motion.div>
          </motion.div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Processing File
          </h3>
          <p className="text-gray-600 mb-6">
            Analyzing and importing your data...
          </p>

          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${processingProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Progress</span>
              <span>{Math.round(processingProgress)}%</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 0.8,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
            }}
            transition={{
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"
          />

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 mb-4"
            >
              <motion.div
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"
              >
                <Cloud className="h-10 w-10" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Import & Export Hub</h1>
                <p className="text-blue-100 text-lg">
                  Seamlessly manage your asset data with advanced file
                  processing
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-3"
            >
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel & CSV Support
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                <Shield className="h-4 w-4 mr-2" />
                Secure Processing
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                <Zap className="h-4 w-4 mr-2" />
                Smart Parsing
              </Badge>
            </motion.div>
          </div>
        </motion.div>

        {/* Parent Department Setup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="rounded-3xl border-0 shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Settings className="h-6 w-6" />
                Step 1: Configure Parent Department
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-4"
              >
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">
                        Why Parent Department?
                      </p>
                      <p className="text-sm text-blue-700">
                        All imported resources will be tagged with this Parent
                        Department for better organization. The department
                        information within your file will be preserved
                        separately.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    type="text"
                    placeholder="e.g., Central IT, Research & Development, Academic Affairs"
                    value={parentDepartment}
                    onChange={(e) => setParentDepartment(e.target.value)}
                    className="h-14 rounded-2xl border-2 focus:border-emerald-500 transition-all duration-300 pl-6 text-base"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <Building2 className="h-5 w-5 text-emerald-500" />
                  </motion.div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Step 2: Upload Your Files
          </h2>
          <p className="text-gray-600 text-lg">
            Choose your preferred file format and start importing
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* CSV Upload */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="rounded-3xl border-0 shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden h-full">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <File className="h-6 w-6" />
                  CSV Import
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div
                  className={`relative border-3 border-dashed rounded-3xl p-8 text-center transition-all duration-300 ${
                    dragActive
                      ? "border-green-400 bg-green-50 scale-105"
                      : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, "csv")}
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="mb-6"
                  >
                    <Upload className="mx-auto h-16 w-16 text-green-500" />
                  </motion.div>

                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Drop your CSV file here
                  </h3>
                  <p className="text-gray-600 mb-6">
                    or click to browse and select
                  </p>

                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => onFileSelect(e, "csv")}
                    className="hidden"
                  />

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => csvInputRef.current?.click()}
                      disabled={isUploading || !parentDepartment}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isUploading
                        ? "Processing..."
                        : !parentDepartment
                        ? "Set Department First"
                        : "Choose CSV File"}
                    </Button>
                  </motion.div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Required Columns:
                    </p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>SL No • Description • Service Tag • ID Number</p>
                      <p>Procurement Date • Cost • Location • Department</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Excel Upload */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="rounded-3xl border-0 shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden h-full">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <FileSpreadsheet className="h-6 w-6" />
                  Excel Import
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div
                  className={`relative border-3 border-dashed rounded-3xl p-8 text-center transition-all duration-300 ${
                    dragActive
                      ? "border-blue-400 bg-blue-50 scale-105"
                      : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, "excel")}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="mb-6"
                  >
                    <FileSpreadsheet className="mx-auto h-16 w-16 text-blue-500" />
                  </motion.div>

                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Drop your Excel file here
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Supports .xlsx and .xls formats
                  </p>

                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => onFileSelect(e, "excel")}
                    className="hidden"
                  />

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => excelInputRef.current?.click()}
                      disabled={isUploading || !parentDepartment}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isUploading
                        ? "Processing..."
                        : !parentDepartment
                        ? "Set Department First"
                        : "Choose Excel File"}
                    </Button>
                  </motion.div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Supported Formats:
                    </p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>• Standard tabular format (.xlsx, .xls)</p>
                      <p>• Multi-section with location headers</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Results Display */}
        <AnimatePresence>
          {uploadResult && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="rounded-3xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl overflow-hidden">
                <CardContent className="p-6">
                  {uploadResult.success ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      {uploadResult.data?.format_type && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Alert className="border-blue-200 bg-blue-50 rounded-2xl">
                            <Info className="h-5 w-5 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                              <strong>Format Detected:</strong>{" "}
                              {
                                getFormatInfo(uploadResult.data.format_type)
                                  ?.description
                              }
                            </AlertDescription>
                          </Alert>
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl border-2 border-green-200"
                      >
                        <div className="flex items-center gap-4">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                            }}
                            className="p-3 bg-green-500 rounded-2xl"
                          >
                            <CheckCircle className="h-8 w-8 text-white" />
                          </motion.div>
                          <div>
                            <h3 className="text-2xl font-bold text-green-800">
                              Upload Successful! 🎉
                            </h3>
                            <p className="text-green-700 text-lg">
                              Successfully processed{" "}
                              {uploadResult.data?.success_count || 0} records
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {(uploadResult.data?.error_count ?? 0) > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          <Alert className="border-amber-200 bg-amber-50 rounded-2xl">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                              <div className="space-y-2">
                                <p>
                                  <strong>Partial Success:</strong>{" "}
                                  {uploadResult.data?.error_count} records had
                                  issues
                                </p>
                                {uploadResult.data?.errors && (
                                  <details className="mt-3">
                                    <summary className="cursor-pointer font-medium hover:text-amber-900 transition-colors">
                                      View error details (
                                      {uploadResult.data.errors.length} total)
                                    </summary>
                                    <div className="mt-3 p-3 bg-white rounded-xl border border-amber-200 max-h-40 overflow-y-auto">
                                      {uploadResult.data.errors
                                        .slice(0, 10)
                                        .map((error, index) => (
                                          <div
                                            key={index}
                                            className="text-sm text-red-700 mb-1"
                                          >
                                            • {error}
                                          </div>
                                        ))}
                                      {uploadResult.data.errors.length > 10 && (
                                        <div className="text-sm text-gray-600 mt-2">
                                          ... and{" "}
                                          {uploadResult.data.errors.length - 10}{" "}
                                          more errors
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                )}
                              </div>
                            </AlertDescription>
                          </Alert>
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex justify-end gap-4"
                      >
                        <Button
                          variant="outline"
                          onClick={() => {
                            setUploadResult(null);
                            resetFileInputs();
                          }}
                          className="rounded-2xl px-6 py-2 border-2 hover:bg-gray-50 transition-all duration-300"
                        >
                          Upload Another File
                        </Button>
                        <Button
                          onClick={() => (window.location.href = "/resources")}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          View Resources
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 bg-gradient-to-r from-green-50 to-pink-50 rounded-3xl border-2 border-blue-200"
                    >
                      <div className="flex items-center gap-4">
                        <motion.div
                          transition={{ duration: 0.5 }}
                          className="p-3 bg-green-500 rounded-2xl"
                        >
                          <AlertCircle className="h-8 w-8 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="text-2xl font-bold text-green-800">
                            Upload Success
                          </h3>
                          <p className="text-blue-700">
                            {uploadResult.success}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Export Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Card className="rounded-3xl border-0 shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Download className="h-7 w-7" />
                Export Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    format: "csv",
                    title: "CSV Export",
                    description:
                      "Lightweight format perfect for data analysis and spreadsheet applications",
                    icon: File,
                    gradient: "from-blue-500 to-cyan-500",
                    delay: 0.1,
                  },
                  {
                    format: "excel",
                    title: "Excel Export",
                    description:
                      "Rich format with formatting support, ideal for reports and presentations",
                    icon: FileSpreadsheet,
                    gradient: "from-green-500 to-emerald-500",
                    delay: 0.2,
                  },
                ].map((exportOption) => (
                  <motion.div
                    key={exportOption.format}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: exportOption.delay }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="group relative overflow-hidden"
                  >
                    <div
                      className={`relative p-8 rounded-3xl bg-gradient-to-br ${exportOption.gradient} text-white shadow-xl hover:shadow-2xl transition-all duration-300`}
                    >
                      <motion.div
                        transition={{
                          duration: 10,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"
                      />

                      <div className="relative z-10">
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 15 }}
                          transition={{ type: "spring", stiffness: 400 }}
                          className="mb-6"
                        >
                          <exportOption.icon className="h-16 w-16 mx-auto" />
                        </motion.div>

                        <h3 className="text-2xl font-bold mb-3 text-center">
                          {exportOption.title}
                        </h3>
                        <p className="text-center mb-6 opacity-90">
                          {exportOption.description}
                        </p>

                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={() => handleExport(exportOption.format)}
                            className="w-full bg-white/20 hover:bg-white/30 text-white rounded-2xl py-3 text-lg font-medium backdrop-blur-sm border border-white/30 hover:border-white/50 transition-all duration-300"
                          >
                            <Download className="h-5 w-5 mr-2" />
                            Download {exportOption.title}
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <Card className="rounded-3xl border-0 shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardTitle className="text-2xl">📚 File Format Guide</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-xl">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h4 className="text-lg font-bold text-green-600">
                      Supported Formats
                    </h4>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Standard tabular format (.xlsx, .xls)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Multi-section format with headers
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      CSV files with proper encoding
                    </li>
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-bold text-blue-600">
                      Required Fields
                    </h4>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      SL No, Description, Service Tag
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Identification Number, Cost
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Procurement Date, Location, Department
                    </li>
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-xl">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-bold text-purple-600">
                      Smart Features
                    </h4>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      Auto-detects multi-section files
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      Extracts department from headers
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      Parent department grouping
                    </li>
                  </ul>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ImportExportPage;
