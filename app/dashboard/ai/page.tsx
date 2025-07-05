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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    setAutoScroll(true); // Enable auto-scroll when sending a message

    const token = localStorage.getItem("session_token");
    if (!token) return;

    try {
      let response;
      let data;

      if (activeTab === "crud") {
        // Natural language CRUD
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
        // Regular chat
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
          // Format CRUD response
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
          // Check if response is JSON (hallucination issue)
          try {
            const jsonTest = JSON.parse(data.data.response);
            // If it's JSON, format it nicely
            assistantContent = `**⚠️ Debug Info:** I received structured data, but let me provide a better response:\n\n\`\`\`json\n${JSON.stringify(
              jsonTest,
              null,
              2
            )}\n\`\`\`\n\n**Note:** The AI backend seems to be returning raw JSON. This should be fixed in the backend AI service to provide natural language responses instead.`;
          } catch {
            // Not JSON, use as is
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
    return (
      content
        // Bold text
        .replace(
          /\*\*(.*?)\*\*/g,
          "<strong class='font-semibold text-gray-900'>$1</strong>"
        )
        // Italic text
        .replace(/\*(.*?)\*/g, "<em class='italic'>$1</em>")
        // Code blocks
        .replace(
          /```(\w+)?\n([\s\S]*?)```/g,
          "<pre class='bg-gray-100 p-4 rounded-lg mt-2 mb-2 overflow-x-auto'><code class='text-sm'>$2</code></pre>"
        )
        // Inline code
        .replace(
          /`([^`]+)`/g,
          "<code class='bg-gray-100 px-2 py-1 rounded text-sm font-mono'>$1</code>"
        )
        // Lists
        .replace(
          /^• (.+)$/gm,
          "<div class='flex items-start mb-2'><span class='text-purple-600 mr-2'>•</span><span>$1</span></div>"
        )
        // Line breaks
        .replace(/\n/g, "<br>")
    );
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
    <div className="space-y-6 max-w-full min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-6 text-white shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          <Brain className="mr-3 h-8 w-8" />
          AI Assistant
        </h1>
        <p className="text-purple-100">
          Interact with your data using natural language and AI intelligence
        </p>
      </div>

      {/* Mode Selector */}
      <Card className="rounded-3xl border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-4">
          <div className="flex space-x-3">
            <Button
              variant={activeTab === "chat" ? "default" : "outline"}
              onClick={() => setActiveTab("chat")}
              className="flex items-center rounded-2xl px-4 py-2 transition-all duration-300"
              style={{
                background:
                  activeTab === "chat"
                    ? "linear-gradient(135deg, #8B5CF6, #EC4899)"
                    : "",
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat Mode
            </Button>
            <Button
              variant={activeTab === "crud" ? "default" : "outline"}
              onClick={() => setActiveTab("crud")}
              className="flex items-center rounded-2xl px-4 py-2 transition-all duration-300"
              style={{
                background:
                  activeTab === "crud"
                    ? "linear-gradient(135deg, #8B5CF6, #EC4899)"
                    : "",
              }}
            >
              <Database className="mr-2 h-4 w-4" />
              CRUD Operations
            </Button>
          </div>
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
            <p className="text-sm text-gray-700 font-medium">
              {activeTab === "chat"
                ? "💬 Ask questions about your resources and get intelligent responses with insights and analytics."
                : "🛠️ Use natural language to create, read, update, or delete resources directly from conversation."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-5 gap-6">
        {/* Chat Interface - Expanded */}
        <div className="xl:col-span-4">
          <Card className="flex flex-col rounded-3xl border-0 shadow-2xl bg-white/90 backdrop-blur-sm min-h-[calc(100vh-300px)]">
            <CardHeader className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-3xl pb-4">
              <CardTitle className="flex items-center text-lg">
                <Bot className="mr-2 h-5 w-5" />
                {activeTab === "chat"
                  ? "AI Chat Assistant"
                  : "Natural Language CRUD"}
              </CardTitle>
              <CardDescription className="text-purple-100 text-sm">
                {activeTab === "chat"
                  ? "Ask questions about your resources and get intelligent insights"
                  : "Perform database operations using natural language commands"}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <div className="flex-1 relative">
                <ScrollArea
                  className="h-full p-4"
                  ref={scrollAreaRef}
                  onScroll={handleScroll}
                >
                  <div className="space-y-4 pr-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.type === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-4 shadow-sm break-words group relative ${
                            message.type === "user"
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                              : "bg-white border border-gray-200 text-gray-900"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`p-2 rounded-xl flex-shrink-0 ${
                                message.type === "user"
                                  ? "bg-white/20"
                                  : "bg-gradient-to-r from-purple-500 to-pink-500"
                              }`}
                            >
                              {message.type === "assistant" ? (
                                <Bot className="h-4 w-4 text-white" />
                              ) : (
                                <User className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-sm leading-relaxed break-words"
                                dangerouslySetInnerHTML={{
                                  __html: formatMessage(message.content),
                                }}
                              />
                              <div className="flex items-center justify-between mt-2">
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
                                    copyToClipboard(message.content, message.id)
                                  }
                                  className={`opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ${
                                    message.type === "user"
                                      ? "hover:bg-white/20"
                                      : "hover:bg-gray-100"
                                  }`}
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                              <span className="text-sm text-gray-600">
                                AI is thinking...
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Scroll to bottom button */}
                {showScrollButton && (
                  <Button
                    onClick={() => {
                      setAutoScroll(true);
                      scrollToBottom();
                    }}
                    className="absolute bottom-4 right-4 rounded-full h-10 w-10 bg-purple-600 hover:bg-purple-700 shadow-lg"
                    size="icon"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Separator />

              <div className="p-4 bg-gray-50 rounded-b-3xl flex-shrink-0">
                <div className="flex space-x-3">
                  <Input
                    placeholder={
                      activeTab === "chat"
                        ? "Ask a question about your resources..."
                        : "Describe what you want to do (e.g., 'update cost to ₹1000 for CSE department')..."
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="flex-1 h-12 rounded-xl border-2 focus:border-purple-500 transition-colors"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputValue.trim()}
                    size="icon"
                    className="h-12 w-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex-shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Condensed */}
        <div className="space-y-4">
          {/* Report Generation Card */}
          <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <FileText className="mr-2 h-4 w-4 text-orange-600" />
                Generate Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => downloadReport("comprehensive")}
                disabled={generatingReport !== null}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl h-10 shadow-md hover:shadow-lg transition-all duration-300"
              >
                {generatingReport === "comprehensive" ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Comprehensive Report</span>
                  </div>
                )}
              </Button>

              <Button
                onClick={() => downloadReport("summary")}
                disabled={generatingReport !== null}
                variant="outline"
                className="w-full border-orange-200 hover:bg-orange-50 text-orange-700 rounded-xl h-10 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {generatingReport === "summary" ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Summary Report</span>
                  </div>
                )}
              </Button>

              <div className="mt-3 p-3 bg-white rounded-xl border border-orange-100">
                <p className="text-xs text-orange-700">
                  <strong>💡 Tip:</strong> Use comprehensive reports for
                  detailed analysis and summary reports for quick overviews.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                Examples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exampleQueries[activeTab].slice(0, 3).map((query, index) => (
                <div
                  key={index}
                  className="p-3 bg-white rounded-xl cursor-pointer hover:bg-purple-50 transition-all duration-200 shadow-sm hover:shadow-md border border-purple-100"
                  onClick={() => setInputValue(query)}
                >
                  <p className="text-xs text-gray-700 font-medium break-words">
                    {query}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600 font-medium">
                  AI Online
                </span>
              </div>
              <div className="space-y-1">
                <Badge
                  variant="outline"
                  className="rounded-full bg-green-100 text-green-700 border-green-200 text-xs"
                >
                  GROQ AI
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full bg-blue-100 text-blue-700 border-blue-200 text-xs"
                >
                  NLP Ready
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
