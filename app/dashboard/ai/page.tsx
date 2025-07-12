"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
  Database,
  MessageSquare,
  Zap,
  Brain,
  ArrowDown,
  Copy,
  Check,
  FileText,
  Download,
  Wand2,
  Stars,
  Activity,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "assistant",
      content:
        'Hello! 👋 I\'m your AI assistant for Campus Assets. I can help you with:\n\n• **Natural language CRUD operations** (e.g., "update cost to ₹1000 for CSE department")\n• **Answer questions** about your resources\n• **Provide insights** and analytics\n• **Generate reports** and summaries\n\nWhat would you like to do today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "crud">("chat");
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState<
    "comprehensive" | "summary" | null
  >(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (messagesEndRef.current && autoScroll) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setAutoScroll(isAtBottom);
      setShowScrollButton(!isAtBottom);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, autoScroll]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setAutoScroll(true);

    const token = localStorage.getItem("session_token");
    if (!token) return;

    try {
      let response;
      let data;

      if (activeTab === "crud") {
        response = await fetch(
          "https://znlm131v-5000.inc1.devtunnels.ms/api/ai/natural-crud",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ instruction: inputValue }),
          }
        );
        data = await response.json();
      } else {
        response = await fetch(
          "https://znlm131v-5000.inc1.devtunnels.ms/api/ai/chat",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: inputValue }),
          }
        );
        data = await response.json();
      }

      let assistantContent = "";

      if (response.ok) {
        if (activeTab === "crud") {
          if (data.data) {
            assistantContent = `✅ **Operation Successful**\n\n`;
            if (data.data.matched_count !== undefined) {
              assistantContent += `• **Matched:** ${data.data.matched_count} resources\n`;
              assistantContent += `• **Modified:** ${data.data.modified_count} resources\n`;
            }
            if (data.data.deleted_count !== undefined) {
              assistantContent += `• **Deleted:** ${data.data.deleted_count} resources\n`;
            }
            if (data.data.resource_id) {
              assistantContent += `• **Created resource ID:** ${data.data.resource_id}\n`;
            }
            assistantContent += `\n${data.message}`;
          } else {
            assistantContent =
              data.message || "Operation completed successfully";
          }
        } else {
          try {
            const jsonTest = JSON.parse(data.data.response);
            assistantContent = `**⚠️ Debug Info:** I received structured data, but let me provide a better response:\n\n\`\`\`json\n${JSON.stringify(
              jsonTest,
              null,
              2
            )}\n\`\`\`\n\n**Note:** The AI backend seems to be returning raw JSON. This should be fixed in the backend AI service to provide natural language responses instead.`;
          } catch {
            assistantContent = data.data.response;
          }
        }
      } else {
        if (data.data?.missing_fields) {
          assistantContent = `❌ **Missing Information**\n\nTo complete this operation, I need the following fields:\n\n${data.data.missing_fields
            .map((field: string) => `• **${field}**`)
            .join("\n")}\n\nPlease provide these details and try again.`;
        } else {
          assistantContent = `❌ **Error:** ${
            data.error || "Something went wrong"
          }`;
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.ok && activeTab === "crud") {
        toast({
          title: "Operation completed! ✨",
          description: data.message,
        });
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "❌ **Network Error:** Unable to connect to the server. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content: string) => {
    return content
      .replace(
        /\*\*(.*?)\*\*/g,
        "<strong class='font-semibold text-gray-900'>$1</strong>"
      )
      .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")
      .replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        "<pre class='bg-gray-100 p-4 rounded-lg mt-2 mb-2 overflow-x-auto'><code class='text-sm'>$2</code></pre>"
      )
      .replace(
        /`([^`]+)`/g,
        "<code class='bg-gray-100 px-2 py-1 rounded text-sm font-mono'>$1</code>"
      )
      .replace(
        /^• (.+)$/gm,
        "<div class='flex items-start mb-2'><span class='text-purple-600 mr-2'>•</span><span>$1</span></div>"
      )
      .replace(/\n/g, "<br>");
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      toast({
        title: "Copied to clipboard!",
        description: "Message content has been copied.",
      });
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const downloadReport = async (type: "comprehensive" | "summary") => {
    try {
      setGeneratingReport(type);
      const endpoint =
        type === "comprehensive"
          ? "/api/report/comprehensive-pdf"
          : "/api/report/summary-pdf";

      const token = localStorage.getItem("session_token");
      const response = await fetch(
        `https://znlm131v-5000.inc1.devtunnels.ms${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campus_assets_${type}_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report downloaded successfully! 📄",
        description: `${
          type === "comprehensive" ? "Comprehensive" : "Summary"
        } report has been saved to your downloads.`,
      });
    } catch (error) {
      toast({
        title: "Failed to generate report",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
      setShowReportDialog(false);
    }
  };

  const exampleQueries = {
    chat: [
      "How many resources do we have in the CSE department?",
      "What's the total value of assets in Building A?",
      "Show me the most expensive equipment",
      "Which location has the most resources?",
      "Generate a summary report of all assets",
    ],
    crud: [
      "Update cost to ₹1500 for all computers in CSE department",
      "Create new laptop with cost ₹80000 in CSE department",
      "Delete all resources in old building",
      "Change location to 'New Lab' for service tag ABC123",
      "Add new projector worth ₹25000 in ECE department",
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl mx-6 mt-6 mb-8 shadow-2xl"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
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
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 15,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"
        />

        <div className="relative z-10 p-8 text-white">
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
              <Brain className="h-10 w-10" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold mb-2">AI Assistant</h1>
              <p className="text-indigo-100 text-lg">
                Interact with your data using natural language and AI
                intelligence
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
              <Sparkles className="h-4 w-4 mr-2" />
              GPT-4 Powered
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
              <Database className="h-4 w-4 mr-2" />
              Real-time CRUD
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
              <BarChart3 className="h-4 w-4 mr-2" />
              Smart Analytics
            </Badge>
          </motion.div>
        </div>
      </motion.div>

      <div className="container mx-auto px-6 pb-8">
        {/* Enhanced Mode Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card className="rounded-3xl border-0 shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex gap-3 flex-1">
                  {[
                    {
                      id: "chat",
                      icon: MessageSquare,
                      title: "Chat Mode",
                      description: "Ask questions and get insights",
                      gradient: "from-blue-500 to-cyan-500",
                    },
                    {
                      id: "crud",
                      icon: Database,
                      title: "CRUD Operations",
                      description: "Natural language data operations",
                      gradient: "from-purple-500 to-pink-500",
                    },
                  ].map((mode) => (
                    <motion.button
                      key={mode.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(mode.id as any)}
                      className={`flex-1 p-4 rounded-2xl transition-all duration-300 text-left ${
                        activeTab === mode.id
                          ? `bg-gradient-to-r ${mode.gradient} text-white shadow-lg`
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <mode.icon className="h-5 w-5" />
                        <div>
                          <h3 className="font-semibold">{mode.title}</h3>
                          <p
                            className={`text-sm ${
                              activeTab === mode.id
                                ? "text-white/80"
                                : "text-gray-500"
                            }`}
                          >
                            {mode.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-2"
                >
                  <Dialog
                    open={showReportDialog}
                    onOpenChange={setShowReportDialog}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <FileText className="h-5 w-5 mr-2" />
                        Generate Reports
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                            }}
                          >
                            <FileText className="h-8 w-8 text-orange-600" />
                          </motion.div>
                          Generate PDF Reports
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                          Choose the type of report you want to generate
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 mt-6">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white cursor-pointer"
                          onClick={() => downloadReport("comprehensive")}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 10,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                            }}
                            className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"
                          />
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-xl font-bold">
                                Comprehensive Report
                              </h3>
                              {generatingReport === "comprehensive" ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                              ) : (
                                <Download className="h-6 w-6" />
                              )}
                            </div>
                            <p className="text-blue-100">
                              Detailed analysis with charts, statistics, and
                              complete asset breakdown
                            </p>
                          </div>
                        </motion.div>

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white cursor-pointer"
                          onClick={() => downloadReport("summary")}
                        >
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{
                              duration: 8,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                            }}
                            className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full"
                          />
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-xl font-bold">
                                Summary Report
                              </h3>
                              {generatingReport === "summary" ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                              ) : (
                                <Download className="h-6 w-6" />
                              )}
                            </div>
                            <p className="text-purple-100">
                              Quick overview with key metrics and essential
                              information
                            </p>
                          </div>
                        </motion.div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid xl:grid-cols-4 gap-8">
          {/* Enhanced Chat Interface */}
          <div className="xl:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="flex flex-col rounded-3xl border-0 shadow-2xl bg-white/95 backdrop-blur-xl min-h-[calc(100vh-400px)] overflow-hidden">
                <CardHeader className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-t-3xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                        className="p-2 bg-white/20 rounded-xl"
                      >
                        <Bot className="h-6 w-6" />
                      </motion.div>
                      <div>
                        <CardTitle className="text-xl">
                          {activeTab === "chat"
                            ? "AI Chat Assistant"
                            : "Natural Language CRUD"}
                        </CardTitle>
                        <CardDescription className="text-slate-300 text-sm">
                          {activeTab === "chat"
                            ? "Ask questions about your resources and get intelligent insights"
                            : "Perform database operations using natural language commands"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm text-slate-300">Online</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  <div className="flex-1 relative">
                    <ScrollArea
                      className="h-full p-6"
                      ref={scrollAreaRef}
                      onScroll={handleScroll}
                    >
                      <div className="space-y-6 pr-2">
                        <AnimatePresence>
                          {messages.map((message, index) => (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ delay: index * 0.1 }}
                              className={`flex ${
                                message.type === "user"
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[85%] rounded-3xl p-6 shadow-lg break-words group relative ${
                                  message.type === "user"
                                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                                    : "bg-white border border-gray-200 text-gray-900 shadow-xl"
                                }`}
                              >
                                <div className="flex items-start space-x-4">
                                  <motion.div
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    className={`p-3 rounded-2xl flex-shrink-0 ${
                                      message.type === "user"
                                        ? "bg-white/20"
                                        : "bg-gradient-to-r from-purple-500 to-pink-500"
                                    }`}
                                  >
                                    {message.type === "assistant" ? (
                                      <Bot className="h-5 w-5 text-white" />
                                    ) : (
                                      <User className="h-5 w-5 text-blue-600" />
                                    )}
                                  </motion.div>
                                  <div className="flex-1 min-w-0">
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.2 }}
                                      className="text-sm leading-relaxed break-words"
                                      dangerouslySetInnerHTML={{
                                        __html: formatMessage(message.content),
                                      }}
                                    />
                                    <div className="flex items-center justify-between mt-4">
                                      <div
                                        className={`text-xs ${
                                          message.type === "user"
                                            ? "text-blue-100"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {message.timestamp.toLocaleTimeString()}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          copyToClipboard(
                                            message.content,
                                            message.id
                                          )
                                        }
                                        className={`opacity-0 group-hover:opacity-100 transition-all duration-300 h-8 w-8 p-0 rounded-xl ${
                                          message.type === "user"
                                            ? "hover:bg-white/20"
                                            : "hover:bg-gray-100"
                                        }`}
                                      >
                                        {copiedMessageId === message.id ? (
                                          <Check className="h-4 w-4" />
                                        ) : (
                                          <Copy className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex justify-start"
                          >
                            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xl">
                              <div className="flex items-center space-x-4">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 2,
                                    repeat: Number.POSITIVE_INFINITY,
                                    ease: "linear",
                                  }}
                                  className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl"
                                >
                                  <Bot className="h-5 w-5 text-white" />
                                </motion.div>
                                <div className="flex items-center space-x-3">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                      duration: 1,
                                      repeat: Number.POSITIVE_INFINITY,
                                      ease: "linear",
                                    }}
                                  >
                                    <Loader2 className="h-5 w-5 text-purple-600" />
                                  </motion.div>
                                  <div className="flex space-x-1">
                                    {[0, 1, 2].map((i) => (
                                      <motion.div
                                        key={i}
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{
                                          duration: 0.6,
                                          repeat: Number.POSITIVE_INFINITY,
                                          delay: i * 0.2,
                                        }}
                                        className="w-2 h-2 bg-purple-600 rounded-full"
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-600 font-medium">
                                    AI is thinking...
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <div ref={messagesEndRef} />
                    </ScrollArea>

                    {showScrollButton && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute bottom-6 right-6"
                      >
                        <Button
                          onClick={() => {
                            setAutoScroll(true);
                            scrollToBottom();
                          }}
                          className="rounded-full h-12 w-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300"
                          size="icon"
                        >
                          <ArrowDown className="h-5 w-5" />
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  <Separator />

                  <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-b-3xl flex-shrink-0">
                    <div className="flex space-x-4">
                      <div className="flex-1 relative">
                        <Input
                          placeholder={
                            activeTab === "chat"
                              ? "Ask me anything about your campus assets..."
                              : "Describe what you want to do (e.g., 'update cost to ₹1000 for CSE department')..."
                          }
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          disabled={isLoading}
                          className="h-14 rounded-2xl border-2 focus:border-purple-500 transition-all duration-300 pl-6 pr-16 text-base"
                        />
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                          <Wand2 className="h-5 w-5 text-purple-500" />
                        </motion.div>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={handleSendMessage}
                          disabled={isLoading || !inputValue.trim()}
                          size="icon"
                          className="h-14 w-14 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transform transition-all duration-300 flex-shrink-0"
                        >
                          {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <Send className="h-6 w-6" />
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Examples Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="rounded-3xl border-0 shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                  <CardTitle className="flex items-center gap-3">
                    <Stars className="h-6 w-6" />
                    Quick Examples
                  </CardTitle>
                  <CardDescription className="text-indigo-100">
                    Try these sample queries
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <AnimatePresence>
                    {exampleQueries[activeTab]
                      .slice(0, 4)
                      .map((query, index) => (
                        <motion.div
                          key={`${activeTab}-${index}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          className="group relative overflow-hidden p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-2xl cursor-pointer hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 border border-gray-100 hover:border-indigo-200"
                          onClick={() => setInputValue(query)}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            whileHover={{ width: "100%" }}
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10"
                          />
                          <div className="relative z-10 flex items-center gap-3">
                            <motion.div
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.5 }}
                              className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl"
                            >
                              {activeTab === "chat" ? (
                                <MessageSquare className="h-4 w-4 text-white" />
                              ) : (
                                <Database className="h-4 w-4 text-white" />
                              )}
                            </motion.div>
                            <p className="text-sm text-gray-700 font-medium break-words flex-1 group-hover:text-indigo-700 transition-colors">
                              {query}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>

            {/* Status Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Card className="rounded-3xl border-0 shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                  <CardTitle className="flex items-center gap-3">
                    <Activity className="h-6 w-6" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                          className="h-3 w-3 bg-green-500 rounded-full"
                        />
                        <span className="text-sm text-gray-600 font-medium">
                          AI Status
                        </span>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Online
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Response Time
                        </span>
                        <span className="text-xs font-medium text-gray-700">
                          ~1.2s
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "85%" }}
                          transition={{ delay: 1.2, duration: 1 }}
                          className="h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Badge
                        variant="outline"
                        className="rounded-full bg-purple-50 text-purple-700 border-purple-200 text-xs justify-center"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        GROQ AI
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-full bg-blue-50 text-blue-700 border-blue-200 text-xs justify-center"
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        NLP Ready
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
