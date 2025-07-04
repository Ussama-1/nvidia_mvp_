"use client";

import type React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Video, ImageIcon, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";

interface ProcessingStep {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
}

const MeasurementAnalyzer = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalResult, setFinalResult] = useState<string>("");
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  useEffect(() => {
    router.push("/dashboard/upload");
  }, [router]);

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
      setSessionId("");
    },
    []
  );

  const uploadAndSummarize = async (): Promise<string> => {
    if (!uploadedFile) throw new Error("No file uploaded");

    updateStep(0, "processing", 25);
    addLog("Uploading file to NVIDIA API...");

    // Upload file
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
    setSessionId(uploadData.sessionId);

    updateStep(0, "processing", 50);
    addLog("File uploaded successfully, generating summary...");

    // Get summary

    console.log("Session ID:", uploadData.sessionId);
    const summaryResponse = await fetch("/api/process-media?action=chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: uploadData.sessionId,
        query:
          "Summarize this video/image focusing on any visible measurements, dimensions, construction elements, rooms, walls, floors, ceilings, or any structural components that could be measured.",
        stream: false,
      }),
    });

    const summaryData = await summaryResponse.json();
    const summary = summaryData.choices?.[0]?.message?.content || "";
    console.log("Summary:", summary);
    updateStep(0, "completed", 100);
    addLog("Summary generated successfully");

    return summary;
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
    questions: string[]
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

      const response = await fetch("/api/process-media?action=chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          query: question,
          stream: false,
        }),
      });

      const data = await response.json();
      const answer =
        data.choices?.[0]?.message?.content || "No answer available";
      answers.push(answer);

      // Small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 500));
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
      // Step 1: Upload and summarize
      const summary = await uploadAndSummarize();

      // Step 2: Generate questions
      const questions = await generateQuestions(summary);

      // Step 3: Analyze with questions
      const answers = await analyzeWithQuestions(questions);

      // Step 4: Format final result
      const result = await formatFinalResult(questions, answers);

      setFinalResult(result);
      addLog("Analysis completed successfully!");
    } catch (error) {
      console.error("Analysis error:", error);
      addLog(`Error: ${error}`);
      updateStep(currentStep, "error", 0);
    } finally {
      setIsProcessing(false);
    }
  };

  const isVideo = uploadedFile?.type.startsWith("video");
  // const isImage = uploadedFile?.type.startsWith("image");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Construction Measurement Analyzer
            </h1>
            <p className="text-gray-600 text-lg">
              AI-powered measurement extraction from videos and images
            </p>
          </div>

          {/* Upload Section */}
          <Card className="mb-8">
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
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 cursor-pointer hover:border-blue-400 transition-colors text-center"
                >
                  <div className="flex justify-center gap-4 mb-4">
                    <Video className="w-16 h-16 text-gray-400" />
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Upload Video or Image
                  </h3>
                  <p className="text-gray-500 mb-4">
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
                        className="w-full max-w-2xl mx-auto rounded-lg"
                      />
                    )}
                    <div className="mt-4 text-center">
                      <p className="font-medium text-gray-700">
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
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Analysis Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processingSteps.map((step) => (
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
                          {step.progress}%
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
          {processingLogs.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Processing Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {processingLogs.map((log, index) => (
                    <div key={index} className="text-sm text-gray-600 mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                  <pre className="whitespace-pre-wrap text-gray-800 font-mono text-sm leading-relaxed">
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

export default MeasurementAnalyzer;
