"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Send,
  Trash2,
  Video,
  MessageCircle,
  Loader2,
} from "lucide-react";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const VideoChat = () => {
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validTypes = ["video/mp4", "video/avi", "video/mov", "video/wmv"];
      if (!validTypes.includes(file.type)) {
        alert("Please select a valid video file (MP4, AVI, MOV, WMV)");
        return;
      }

      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        alert("File size must be less than 100MB");
        return;
      }

      setUploadedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    },
    []
  );

  const uploadVideo = async () => {
    if (!uploadedVideo) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("mediaFiles", uploadedVideo);

      const response = await fetch("/api/process-media", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setSessionId(data.sessionId);

      setMessages([
        {
          id: `msg_${Date.now()}`,
          type: "assistant" as const,
          content:
            "Video uploaded successfully! You can now ask questions about the video.",
          timestamp: new Date(),
        },
      ]);

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload video. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentQuery.trim() || !sessionId || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      type: "user",
      content: currentQuery,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentQuery("");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/process-media?action=chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          query: currentQuery,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content || "No response received";

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        type: "assistant",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        type: "assistant",
        content:
          "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const clearSession = async () => {
    if (sessionId) {
      try {
        await fetch("/api/process-media?action=cleanup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
          }),
        });
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }

    setUploadedVideo(null);
    setVideoPreview("");
    setSessionId("");
    setMessages([]);
    setCurrentQuery("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              AI Video Analysis
            </h1>
            <p className="text-slate-300">
              Upload a video and ask questions about its content
            </p>
          </div>

          {/* Upload Section */}
          {!sessionId && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
              <div className="text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!uploadedVideo ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/30 rounded-xl p-12 cursor-pointer hover:border-white/50 transition-colors"
                  >
                    <Video className="w-16 h-16 text-white/60 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Upload Video
                    </h3>
                    <p className="text-slate-300 mb-4">
                      Click to select a video file (MP4, AVI, MOV, WMV)
                    </p>
                    <div className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
                      <Upload className="w-5 h-5" />
                      Choose File
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-xl p-6">
                      <video
                        src={videoPreview}
                        controls
                        className="w-full max-w-md mx-auto rounded-lg"
                      />
                      <div className="mt-4 text-center">
                        <p className="text-white font-medium">
                          {uploadedVideo.name}
                        </p>
                        <p className="text-slate-300 text-sm">
                          {(uploadedVideo.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={uploadVideo}
                        disabled={isUploading}
                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-8 py-3 rounded-lg transition-colors"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            Upload & Analyze
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setUploadedVideo(null);
                          setVideoPreview("");
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Section */}
          {sessionId && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              {/* Chat Header */}
              <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-white font-medium">
                      Video Analysis Active
                    </span>
                  </div>
                  <button
                    onClick={clearSession}
                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Session
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        message.type === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white/10 text-white border border-white/20"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span className="text-white text-sm">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-6 border-t border-white/10">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={currentQuery}
                      onChange={(e) => setCurrentQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask a question about the video..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!currentQuery.trim() || isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white p-3 rounded-xl transition-colors flex-shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
