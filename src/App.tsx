import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  Loader2, 
  Pencil,
  FileImage, 
  FileCode, 
  FileJson,
  Download,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Trash2,
  Moon,
  Sun,
  LogOut,
  Zap
} from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { analyzeImage, recreateArtworkFromImage, type AnalysisResult } from "../lib/gemini";
import { getApiBaseUrl } from "./lib/api";
import { useAuth } from "./context/AuthContext";
import { checkUsageLimit } from "../lib/usage";
import { cn } from "../lib/utils";

const LOADING_MESSAGES = [
  "Analyzing visual elements...",
  "Stripping away mockups...",
  "Identifying core artwork...",
  "Optimizing for print workflows...",
  "Generating production prompts...",
  "Refining design summary...",
];

export default function App() {
  const FREE_LIMIT = 5;
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, session, signOut, refreshUserProfile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editablePrompts, setEditablePrompts] = useState({ png: "", svg: "" });
  const [activeEditor, setActiveEditor] = useState<"png" | "svg" | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [usageLimit, setUsageLimit] = useState<{ isLimited: boolean; remainingThisPeriod: number; imagesUsedThisPeriod: number } | null>(null);
  const [userInstruction, setUserInstruction] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("weekly");
  const hasAppliedSelectedPlan = useRef(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pngPromptRef = useRef<HTMLTextAreaElement>(null);
  const svgPromptRef = useRef<HTMLTextAreaElement>(null);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Check usage limit on mount and after each analysis
  const checkLimit = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const limit = await checkUsageLimit(session.user.id);
      setUsageLimit(limit);
    } catch (error) {
      console.error("Error checking usage limit:", error);
    }
  }, [session?.user?.id]);

  React.useEffect(() => {
    checkLimit();
  }, [checkLimit]);

  React.useEffect(() => {
    if (!session?.user?.id || hasAppliedSelectedPlan.current) return;

    const pendingPlan = window.sessionStorage.getItem("designdistiller:selected-plan");
    if (pendingPlan === "weekly" || pendingPlan === "monthly") {
      setSelectedPlan(pendingPlan);
      toast.message(`${pendingPlan === "weekly" ? "Weekly" : "Monthly"} plan selected`);
    }

    hasAppliedSelectedPlan.current = true;
  }, [session?.user?.id]);

  React.useEffect(() => {
    setEditablePrompts({
      png: result?.pngPrompt || "",
      svg: result?.svgPrompt || "",
    });
    setActiveEditor(null);
  }, [result]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setMimeType(file.type);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const startAnalysis = async () => {
    if (!image || !mimeType || !session?.user?.id) return;

    // Check usage limit
    if (usageLimit?.isLimited && user?.subscription_tier === "free" && !user?.is_admin) {
      toast.error("You've reached your free weekly limit. Upgrade for more high-quality analyses.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    // Rotate loading messages
    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
    }, 3000);

    try {
      const analysisResult = await analyzeImage(
        image,
        mimeType,
        session.user.id,
        userInstruction,
        session.access_token
      );
      setResult(analysisResult);

      await checkLimit();
      await refreshUserProfile();
      
      toast.success("Analysis complete!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze image. Please try again.");
    } finally {
      clearInterval(interval);
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const reset = () => {
    setImage(null);
    setMimeType(null);
    setResult(null);
    setGeneratedImage(null);
    setIsAnalyzing(false);
    setIsGenerating(false);
    setUserInstruction("");
    setEditablePrompts({ png: "", svg: "" });
    setActiveEditor(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpgradeClick = async () => {
    if (!user?.id || !user?.email) {
      toast.error("Please log in to upgrade");
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          plan: selectedPlan,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Checkout failed: ${response.statusText}`);
      }

      const { sessionId } = data ?? {};
      if (!sessionId) {
        throw new Error("No session ID returned from checkout");
      }

      // Redirect to Stripe Checkout
      const stripeClient: any = await import("@stripe/stripe-js").then((m) =>
        m.loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
      );

      if (!stripeClient) {
        throw new Error("Failed to load Stripe");
      }

      const redirectResult = await stripeClient.redirectToCheckout({ sessionId });
      if (redirectResult?.error) {
        throw new Error(redirectResult.error.message || "Stripe redirect failed");
      }
    } catch (error) {
      console.error("Error starting checkout:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout. Please try again.");
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "design_analysis.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("JSON file downloaded");
  };

  const handleGenerateImage = async (prompt: string) => {
    if (!image || !mimeType) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const img = await recreateArtworkFromImage(image, mimeType, prompt, userInstruction);
      setGeneratedImage(img);
      toast.success("Artwork recreated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to recreate artwork. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadGeneratedImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = "generated_artwork.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateEditablePrompt = (field: "png" | "svg", value: string) => {
    setEditablePrompts((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const activateEditor = (field: "png" | "svg") => {
    setActiveEditor(field);

    window.requestAnimationFrame(() => {
      const target = field === "png" ? pngPromptRef.current : svgPromptRef.current;
      target?.focus();
      const end = target?.value.length ?? 0;
      target?.setSelectionRange(end, end);
    });
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      <Toaster position="top-center" theme={theme as any} />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground truncate max-w-[180px] sm:max-w-none">
              Design <span className="text-indigo-600">Distiller</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex flex-col items-end">
                  <span className="text-foreground">{user.email}</span>
                  <div className="flex gap-2 items-center">
                    {user.is_admin ? (
                      <Badge variant="default" className="bg-emerald-600">
                        <Zap className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    ) : user.subscription_tier === "monthly" || user.subscription_tier === "premium" ? (
                      <Badge variant="default" className="bg-purple-600">
                        <Zap className="h-3 w-3 mr-1" />
                        Monthly
                      </Badge>
                    ) : user.subscription_tier === "weekly" ? (
                      <Badge variant="default" className="bg-amber-600">
                        <Zap className="h-3 w-3 mr-1" />
                        Weekly
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="outline">
                          {usageLimit?.remainingThisPeriod}/{FREE_LIMIT} left
                        </Badge>
                        <div className="flex items-center gap-2">
                          <div className="flex rounded-md border border-purple-300/30 bg-background/60 p-1">
                            <button
                              type="button"
                              onClick={() => setSelectedPlan("weekly")}
                              className={`rounded px-2 py-1 text-[10px] ${selectedPlan === "weekly" ? "bg-amber-600 text-white" : "text-muted-foreground"}`}
                            >
                              Weekly
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedPlan("monthly")}
                              className={`rounded px-2 py-1 text-[10px] ${selectedPlan === "monthly" ? "bg-purple-600 text-white" : "text-muted-foreground"}`}
                            >
                              Monthly
                            </button>
                          </div>
                          <Button
                            size="sm"
                            onClick={handleUpgradeClick}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                          >
                            Upgrade
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
                className="gap-2 border-border text-muted-foreground hover:bg-destructive/10 hover:text-foreground"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Left Column: Upload & Preview */}
          <div className="space-y-6">
            <section>
              <h2 className="mb-4 text-2xl font-bold tracking-tight">Reference Image</h2>
              {!image ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200",
                    isDragging 
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[1.02]" 
                      : "border-border bg-card p-12 hover:border-indigo-400 hover:bg-accent/50",
                    "min-h-[400px]"
                  )}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="mb-4 rounded-full bg-indigo-50 dark:bg-indigo-900/20 p-4 text-indigo-600 dark:text-indigo-400 transition-transform group-hover:scale-110">
                    <Upload className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-foreground">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG, WEBP up to 10MB</p>
                  </div>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 bg-indigo-600 hover:bg-indigo-700"
                  >
                    Select Image
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative overflow-hidden rounded-2xl border bg-card shadow-sm"
                >
                  <img 
                    src={image} 
                    alt="Preview" 
                    className="h-auto w-full max-h-[600px] object-contain"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      onClick={reset}
                      className="h-9 w-9 rounded-full shadow-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {!result && !isAnalyzing && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                      <Button 
                        onClick={startAnalysis}
                        className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                        size="lg"
                      >
                        Extract Design <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </section>

            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Optional Instruction</CardTitle>
                <CardDescription>
                  Tell the AI what to change or preserve. Example: "Keep the layout, but change the green lettering to deep red."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={userInstruction}
                  onChange={(e) => setUserInstruction(e.target.value)}
                  placeholder="Example: Change the green lettering to red, keep the flowers, and make the text cleaner for print."
                  className="min-h-28 w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none ring-0 transition-colors placeholder:text-muted-foreground focus:border-indigo-500"
                />
              </CardContent>
            </Card>

            {/* Instructions / Tips */}
            <Card className="border-none bg-indigo-50/50 dark:bg-indigo-900/10 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">How it works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-indigo-800/80 dark:text-indigo-300/80">
                <div className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-800 text-[10px] font-bold text-indigo-700 dark:text-indigo-200">1</div>
                  <p>Upload a product mockup or reference image containing the design you want to recreate.</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-800 text-[10px] font-bold text-indigo-700 dark:text-indigo-200">2</div>
                  <p>Our AI analyzes the image, stripping away mockups, shadows, and background clutter.</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-800 text-[10px] font-bold text-indigo-700 dark:text-indigo-200">3</div>
                  <p>Get production-ready prompts for PNG and SVG generation, optimized for commercial print.</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-800 text-[10px] font-bold text-indigo-700 dark:text-indigo-200">4</div>
                  <p>Use the "Recreate Artwork" tool to generate and download high-resolution versions instantly.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="space-y-6">
            <div className="mb-4 space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Extracted Detailed Prompt</h2>
              <p className="text-sm text-muted-foreground">
                This section turns your uploaded design into a detailed editable prompt you can refine before generating artwork.
              </p>
            </div>
            
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center"
                >
                  <div className="relative mb-6">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                    <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400/20" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{loadingMessage}</h3>
                  <p className="mt-2 text-muted-foreground">This usually takes about 10-15 seconds...</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsAnalyzing(false)}
                    className="mt-6 text-muted-foreground hover:text-foreground"
                  >
                    Cancel Analysis
                  </Button>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Summary Card */}
                  <Card className="overflow-hidden border-none shadow-sm">
                    <CardHeader className="bg-indigo-600 text-white">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold">Design Summary</CardTitle>
                        <Badge variant="secondary" className="bg-white/20 text-white border-none hover:bg-white/30">
                          {result.recommendation.split('\n')[0]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground leading-relaxed">{result.summary}</p>
                    </CardContent>
                  </Card>

                  {/* Prompts Tabs */}
                  <Tabs defaultValue="png" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
                      <TabsTrigger value="png" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <FileImage className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> PNG
                      </TabsTrigger>
                      <TabsTrigger value="svg" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <FileCode className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> SVG
                      </TabsTrigger>
                      <TabsTrigger value="json" className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <FileJson className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> JSON
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="png" className="mt-4">
                      <Card className="border-none shadow-sm">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between border-b px-4 py-3">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">High-Resolution Artwork</span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={activeEditor === "png" ? "default" : "outline"}
                                size="sm"
                                onClick={() => activateEditor("png")}
                                className={`h-7 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-2 text-[10px] sm:text-xs ${activeEditor === "png" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700"}`}
                              >
                                <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{activeEditor === "png" ? "Editing" : "Edit"}</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(editablePrompts.png, 'png')}
                                className="h-7 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 text-[10px] sm:text-xs"
                              >
                                {copiedField === 'png' ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                                <span className="hidden sm:inline">{copiedField === 'png' ? 'Copied' : 'Copy Prompt'}</span>
                              </Button>
                            </div>
                          </div>
                          <div className="p-4">
                            <textarea
                              ref={pngPromptRef}
                              value={editablePrompts.png}
                              onChange={(e) => updateEditablePrompt("png", e.target.value)}
                              onFocus={() => setActiveEditor("png")}
                              className={`min-h-[168px] max-h-[240px] w-full resize-y overflow-y-auto rounded-lg border bg-background px-3 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors ${activeEditor === "png" ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-border"}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="svg" className="mt-4">
                      <Card className="border-none shadow-sm">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between border-b px-4 py-3">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Vector-Friendly Logic</span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={activeEditor === "svg" ? "default" : "outline"}
                                size="sm"
                                onClick={() => activateEditor("svg")}
                                className={`h-7 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-2 text-[10px] sm:text-xs ${activeEditor === "svg" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700"}`}
                              >
                                <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{activeEditor === "svg" ? "Editing" : "Edit"}</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(editablePrompts.svg, 'svg')}
                                className="h-7 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 text-[10px] sm:text-xs"
                              >
                                {copiedField === 'svg' ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                                <span className="hidden sm:inline">{copiedField === 'svg' ? 'Copied' : 'Copy Prompt'}</span>
                              </Button>
                            </div>
                          </div>
                          <div className="p-4">
                            <textarea
                              ref={svgPromptRef}
                              value={editablePrompts.svg}
                              onChange={(e) => updateEditablePrompt("svg", e.target.value)}
                              onFocus={() => setActiveEditor("svg")}
                              className={`min-h-[168px] max-h-[240px] w-full resize-y overflow-y-auto rounded-lg border bg-background px-3 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors ${activeEditor === "svg" ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-border"}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="json" className="mt-4">
                      <Card className="border-none shadow-sm">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between border-b px-4 py-3">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Raw Data Structure</span>
                            <div className="flex gap-1 sm:gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(JSON.stringify(result, null, 2), 'json')}
                                className="h-7 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 text-[10px] sm:text-xs"
                              >
                                {copiedField === 'json' ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="h-3 w-3 sm:h-4 sm:w-4" />}
                                <span className="hidden sm:inline">{copiedField === 'json' ? 'Copied' : 'Copy'}</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={downloadJson}
                                className="h-7 sm:h-8 px-2 sm:px-3 gap-1 sm:gap-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 text-[10px] sm:text-xs"
                              >
                                <Download className="h-3 w-3 sm:h-4 sm:w-4" /> 
                                <span className="hidden sm:inline">Download</span>
                              </Button>
                            </div>
                          </div>
                          <ScrollArea className="h-[200px] w-full p-4">
                            <pre className="text-xs leading-relaxed text-foreground font-mono whitespace-pre-wrap break-all">
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  {/* Negative Prompt */}
                  <Card className="border-none bg-slate-900 dark:bg-slate-950 text-slate-100 shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Negative Prompt</CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(result.negativePrompt, 'negative')}
                          className="h-8 gap-2 text-slate-400 hover:bg-white/10 hover:text-white"
                        >
                          {copiedField === 'negative' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs font-mono text-slate-300">
                        {result.negativePrompt}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Recommendation */}
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-4 text-amber-900 dark:text-amber-200">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-bold text-sm">File Recommendation</p>
                      <p className="text-sm opacity-90">{result.recommendation.split('\n').slice(1).join('\n')}</p>
                    </div>
                  </div>

                  {/* Image Generation Section */}
                  <Card className="overflow-hidden border-none shadow-md bg-card">
                    <CardHeader className="bg-slate-900 dark:bg-black text-white">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-400" />
                        <CardTitle className="text-lg font-bold">Replicate Original Design</CardTitle>
                      </div>
                      <CardDescription className="text-slate-400">
                        Generate a clean, standalone version based directly on your reference photo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          onClick={() => handleGenerateImage(editablePrompts.png)}
                          disabled={isGenerating || !editablePrompts.png.trim()}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        >
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileImage className="mr-2 h-4 w-4" />}
                          Replicate PNG Style
                        </Button>
                        <Button 
                          onClick={() => handleGenerateImage(editablePrompts.svg)}
                          disabled={isGenerating || !editablePrompts.svg.trim()}
                          variant="outline"
                          className="flex-1 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        >
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode className="mr-2 h-4 w-4" />}
                          Replicate SVG Style
                        </Button>
                      </div>

                      <AnimatePresence>
                        {generatedImage && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative mt-4 overflow-hidden rounded-xl border bg-muted p-2"
                          >
                            <img 
                              src={generatedImage} 
                              alt="Generated Artwork" 
                              className="h-auto w-full rounded-lg shadow-sm"
                            />
                            <div className="absolute bottom-4 right-4">
                              <Button 
                                size="sm" 
                                onClick={downloadGeneratedImage}
                                className="bg-white/90 dark:bg-black/90 text-slate-900 dark:text-slate-100 hover:bg-white dark:hover:bg-black shadow-lg backdrop-blur-sm"
                              >
                                <Download className="mr-2 h-4 w-4" /> Download PNG
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {isGenerating && !generatedImage && (
                        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-muted">
                          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                          <p className="mt-2 text-sm text-muted-foreground font-medium">Generating your artwork...</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsGenerating(false)}
                            className="mt-2 text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Button 
                    variant="outline" 
                    onClick={reset} 
                    className="w-full border-border text-muted-foreground hover:bg-accent"
                  >
                    Analyze Another Image
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-8 text-center"
                >
                  <div className="mb-4 rounded-full bg-muted p-4 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">No analysis yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Upload an image and click "Extract Design" to see results here.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 DesignDistiller. Built for production artwork workflows.</p>
        </div>
      </footer>
    </div>
  );
}
