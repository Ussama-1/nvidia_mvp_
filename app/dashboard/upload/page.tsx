"use client";

import type React from "react";
import { useState, useRef, useCallback } from "react";
import { Upload, Video, ImageIcon, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface ProcessingStep {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
}

const UploadPage = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalResult, setFinalResult] = useState<string>("");
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialSteps: ProcessingStep[] = [
    {
      id: "upload",
      name: "Media Upload & Summary",
      status: "pending",
      progress: 0,
    },
    {
      id: "questions",
      name: "Generating Analysis Questions",
      status: "pending",
      progress: 0,
    },
    {
      id: "analysis",
      name: "Detailed Measurement Analysis",
      status: "pending",
      progress: 0,
    },
    {
      id: "formatting",
      name: "Formatting Final Results",
      status: "pending",
      progress: 0,
    },
  ];

  const addLog = (message: string) => {
    setProcessingLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const updateStep = (
    stepIndex: number,
    status: ProcessingStep["status"],
    progress: number
  ) => {
    setProcessingSteps((prev) =>
      prev.map((step, index) =>
        index === stepIndex ? { ...step, status, progress } : step
      )
    );
    setCurrentStep(stepIndex);
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validTypes = [
        "video/mp4",
        "video/avi",
        "video/mov",
        "video/wmv",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];

      if (!validTypes.includes(file.type)) {
        alert("Please select a valid video or image file");
        return;
      }

      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        alert("File size must be less than 100MB");
        return;
      }

      setUploadedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setProcessingSteps(initialSteps);
      setProcessingLogs([]);
      setFinalResult("");
    },
    []
  );

  const uploadAndSummarize = async (): Promise<{ summary: string; sessionId: string }> => {
    if (!uploadedFile) throw new Error("No file uploaded");

    updateStep(0, "processing", 25);
    addLog("Uploading file to NVIDIA API...");

    const formData = new FormData();
    formData.append("mediaFiles", uploadedFile);

    const uploadResponse = await fetch("/api/process-media", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Upload failed");
    }

    const uploadData = await uploadResponse.json();

    if (!uploadData.sessionId) {
      throw new Error("No session ID received from API");
    }

    // Update state for UI purposes
    setSessionId(uploadData.sessionId);

    updateStep(0, "processing", 50);
    addLog("File uploaded successfully, generating summary...");

    const summaryResponse = await fetch("/api/process-media?action=chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: uploadData.sessionId, // Use fresh sessionId
        query:
          `ou are an expert visual analyst. Your task is to deeply observe and meticulously summarize the content of the provided video or image. Your summary must include:

A comprehensive list of all objects, people, and key elements visible (e.g., doors, windows, walls, furniture, decorations, colors, textures, lighting).

Detailed descriptions of actions, movements, and interactions between objects or people, if present.

Descriptions of the setting, environment, and atmosphere (e.g., indoor/outdoor, weather, time of day, mood).

Any text, symbols, logos, or signage visible and their possible significance.

Inferred context, purpose, or meaning based on visual clues (e.g., is it a home, office, store, event?).

Emotional tone if detectable from expressions, actions, or atmosphere.

Format the summary into approximately 50 concise but detailed lines, covering every noticeable detail without missing any significant element.`,
        stream: false,
      }),
    });

    const summaryData = await summaryResponse.json();
    const summary = summaryData.choices?.[0]?.message?.content || "";

    updateStep(0, "completed", 100);
    addLog("Summary generated successfully");

    return { summary, sessionId: uploadData.sessionId };
  };

  const generateQuestions = async (summary: string): Promise<string[]> => {
    updateStep(1, "processing", 50);
    addLog("Generating detailed analysis questions...");

    const response = await fetch("/api/openai-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        mediaType: uploadedFile?.type.startsWith("video") ? "video" : "image",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate questions");
    }

    const data = await response.json();
    const questions = data.questions || [];

    updateStep(1, "completed", 100);
    addLog(`Generated ${questions.length} analysis questions`);

    return questions;
  };

  const analyzeWithQuestions = async (
    questions: string[],
    sessionId: string // Accept sessionId as parameter
  ): Promise<string[]> => {
    updateStep(2, "processing", 0);
    addLog("Starting detailed measurement analysis...");

    const answers: string[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const progress = ((i + 1) / questions.length) * 100;

      updateStep(2, "processing", progress);
      addLog(
        `Analyzing question ${i + 1}/${questions.length}: ${question.substring(
          0,
          50
        )}...`
      );

      try {
        const response = await fetch("/api/process-media?action=chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId, // Use passed sessionId
            query: question,
            stream: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const answer =
          data.choices?.[0]?.message?.content || "No answer available";
        answers.push(answer);

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing question ${i + 1}:`, error);
        answers.push("Error processing this question");
      }
    }

    updateStep(2, "completed", 100);
    addLog("Detailed analysis completed");

    return answers;
  };


  const formatFinalResult = async (
    questions: string[],
    answers: string[]
  ): Promise<string> => {
    updateStep(3, "processing", 50);
    addLog("Formatting final measurements...");

    const qaData = questions.map((q, i) => ({
      question: q,
      answer: answers[i] || "No answer",
    }));

    const response = await fetch("/api/openai-format", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qaData }),
    });

    if (!response.ok) {
      throw new Error("Failed to format results");
    }

    const data = await response.json();
    const formattedResult =
      data.result || "No measurements could be determined";

    updateStep(3, "completed", 100);
    addLog("Final formatting completed");

    return formattedResult;
  };

  const startAnalysis = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setCurrentStep(0);

    try {
      // Step 1: Upload and summarize - get sessionId directly
      const { summary, sessionId: freshSessionId } = await uploadAndSummarize();

      // Step 2: Generate questions
      const questions = await generateQuestions(summary);

      // Step 3: Analyze with questions - pass sessionId explicitly
      const answers = await analyzeWithQuestions(questions, freshSessionId);

      // Step 4: Format final result
      const result = await formatFinalResult(questions, answers);

      setFinalResult(result);
      addLog("Analysis completed successfully!");

      // Save to localStorage
      const analysisData = {
        fileName: uploadedFile.name,
        result,
        timestamp: new Date().toISOString(),
        sessionId: freshSessionId,
      };

      const existingAnalyses = JSON.parse(
        localStorage.getItem("analyses") || "[]"
      );
      existingAnalyses.push(analysisData);
      localStorage.setItem("analyses", JSON.stringify(existingAnalyses));
    } catch (error) {
      console.error("Analysis error:", error);
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
      updateStep(currentStep, "error", 0);
    } finally {
      setIsProcessing(false);
    }
  };

  const isVideo = uploadedFile?.type.startsWith("video");
  const isImage = uploadedFile?.type.startsWith("image");

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">Upload & Analyze</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            AI-powered measurement extraction from videos and images
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Upload Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Media File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!uploadedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 lg:p-12 cursor-pointer hover:border-blue-400 transition-colors text-center"
                >
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
                    <Video className="w-14 h-14 lg:w-16 lg:h-16 text-gray-400" />
                    <ImageIcon className="w-14 h-14 lg:w-16 lg:h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Upload Video or Image
                  </h3>
                  <p className="text-gray-500 mb-4 max-w-md mx-auto">
                    Select a construction video or image for measurement
                    analysis
                  </p>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    {isVideo ? (
                      <video
                        src={filePreview}
                        controls
                        className="w-full max-w-2xl mx-auto rounded-lg"
                      />
                    ) : (
                      <img
                        src={filePreview || "/placeholder.svg"}
                        alt="Uploaded"
                        className="w-full max-w-2xl mx-auto rounded-lg object-contain max-h-96"
                      />
                    )}
                    <div className="mt-4 text-center">
                      <p className="font-medium text-gray-700 truncate">
                        {uploadedFile.name}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button
                      onClick={startAnalysis}
                      disabled={isProcessing}
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Start Measurement Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Steps */}
          {isProcessing && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Analysis Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processingSteps.map((step, index) => (
                    <div key={step.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span
                          className={`font-medium ${step.status === "completed"
                            ? "text-green-600"
                            : step.status === "processing"
                              ? "text-blue-600"
                              : step.status === "error"
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                        >
                          {step.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {Math.round(step.progress)}%
                        </span>
                      </div>
                      <Progress value={step.progress} className="w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Logs */}
          {/* {processingLogs.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Processing Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {processingLogs.map((log, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-600 mb-1 break-words"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )} */}

          {/* Final Results */}
          {finalResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Measurement Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-6">
                  <pre className="whitespace-pre-wrap text-gray-800 font-mono text-sm leading-relaxed overflow-x-auto">
                    {finalResult}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
