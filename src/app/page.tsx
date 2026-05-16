"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Task {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  prompt: string;
  model: string;
  ratio: string;
  refImage: string | null;
  date: string;
  progress: number;
  pollCount: number;
  urls?: string[];
  videoUrl?: string;
  error?: string;
  taskId?: string;
  uniqueId?: string;
}

const THEMES = ["cyberpunk", "matrix", "golden", "clean"];

export default function Home() {
  const [theme, setTheme] = useState("cyberpunk");
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("1:1");
  const [videoMode, setVideoMode] = useState("normal");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<Task[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const saved = localStorage.getItem("ximagine_theme") || "cyberpunk";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const toggleTheme = () => {
    const idx = THEMES.indexOf(theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ximagine_theme", next);
    showToast(`Theme: ${next}`);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setUploadedImageUrl(data.data.url);
        showToast("Image uploaded successfully");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (e) {
      showToast(`Upload failed: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = () => {
    setUploadedImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const pollTaskStatus = useCallback(
    (task: Task) => {
      let count = 0;
      const interval = setInterval(async () => {
        count++;
        try {
          const res = await fetch(
            `/api/status?taskId=${task.taskId}&uniqueId=${task.uniqueId}&type=video`
          );
          const data = await res.json();

          if (
            data.status === "completed" ||
            data.videoUrl ||
            (data.urls && data.urls.length > 0)
          ) {
            clearInterval(interval);
            delete pollIntervalsRef.current[task.id];
            const urls = data.urls || (data.videoUrl ? [data.videoUrl] : []);
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
            setHistory((prev) => [
              {
                ...task,
                id: `hist_${Date.now()}`,
                status: "completed",
                progress: 100,
                urls,
                pollCount: count,
              },
              ...prev,
            ]);
            showToast("Generation complete!");
          } else if (data.status === "failed") {
            clearInterval(interval);
            delete pollIntervalsRef.current[task.id];
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, status: "failed" as const, error: data.error, pollCount: count }
                  : t
              )
            );
            showToast(`Generation failed: ${data.error || "Unknown error"}`);
          } else {
            const progress = data.progress || Math.min(95, count * 1.5);
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, progress, pollCount: count }
                  : t
              )
            );
          }
        } catch {
          if (count > 60) {
            clearInterval(interval);
            delete pollIntervalsRef.current[task.id];
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? { ...t, status: "failed" as const, error: "Timed out", pollCount: count }
                  : t
              )
            );
            showToast("Generation timed out");
          }
        }
      }, 2000);

      pollIntervalsRef.current[task.id] = interval;
    },
    [showToast]
  );

  const submitTask = async () => {
    if (!prompt.trim()) return showToast("Please enter a prompt");
    if (prompt.length > 1800) return showToast("Prompt exceeds character limit");

    let modelId = `grok-video-${videoMode}`;
    if (uploadedImageUrl) modelId = "grok-video-image";

    const taskId = `loc_${Date.now()}`;
    const newTask: Task = {
      id: taskId,
      status: "processing",
      prompt: prompt.trim(),
      model: modelId,
      ratio,
      refImage: uploadedImageUrl,
      date: new Date().toLocaleString(),
      progress: 0,
      pollCount: 0,
    };

    setTasks((prev) => [newTask, ...prev]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: modelId,
          aspectRatio: ratio,
          imageUrls: uploadedImageUrl ? [uploadedImageUrl] : [],
        }),
      });

      const data = await res.json();

      if (data.success && data.taskId) {
        const updatedTask = { ...newTask, taskId: data.taskId, uniqueId: data.uniqueId };
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updatedTask : t))
        );
        pollTaskStatus(updatedTask);
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (e) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "failed" as const, error: e instanceof Error ? e.message : "Unknown" }
            : t
        )
      );
      showToast(`Generation failed: ${e instanceof Error ? e.message : "Unknown"}`);
    }
  };

  const deleteItem = (itemId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === itemId);
      if (task && pollIntervalsRef.current[itemId]) {
        clearInterval(pollIntervalsRef.current[itemId]);
        delete pollIntervalsRef.current[itemId];
      }
      return prev.filter((t) => t.id !== itemId);
    });
    setHistory((prev) => prev.filter((h) => h.id !== itemId));
  };

  const downloadVideo = (url: string) => {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    window.open(proxyUrl, "_blank");
    showToast("Download started");
  };

  const allItems = [...tasks, ...history];
  const charCount = prompt.length;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden glass-panel rounded-lg p-2 neon-text"
      >
        <i className={`fas ${sidebarOpen ? "fa-times" : "fa-bars"} text-lg`} />
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative z-40 w-80 xl:w-96 h-full glass-panel flex flex-col p-5 overflow-y-auto transition-transform duration-300`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between mb-5">
          <div className="font-orbitron text-lg xl:text-xl neon-text tracking-widest flex items-center gap-2">
            XIMAGINE PRO
            <span className="text-xs px-2 py-0.5 rounded text-black font-bold" style={{ background: "var(--neon-blue)" }}>
              v2.2
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center border-0 cursor-pointer transition-all hover:scale-110"
            style={{ background: "var(--neon-blue)", color: "#000" }}
            title="Switch Theme"
          >
            <i className="fas fa-palette text-sm" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="glass-bg rounded-lg p-3 mb-4 flex justify-between text-xs">
          <div className="text-center">
            <div className="font-bold neon-text text-lg">{history.filter((h) => h.status === "completed").length}</div>
            <div style={{ color: "var(--text-secondary)" }}>Completed</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg" style={{ color: "var(--neon-pink)" }}>{tasks.length}</div>
            <div style={{ color: "var(--text-secondary)" }}>Active</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg" style={{ color: "var(--neon-yellow)" }}>{history.length + tasks.length}</div>
            <div style={{ color: "var(--text-secondary)" }}>Total</div>
          </div>
        </div>

        {/* Settings */}
        <div className="mb-4">
          <div className="text-sm uppercase tracking-wider font-semibold mb-3 pb-1" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
            Settings
          </div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
            Aspect Ratio
          </label>
          <select
            value={ratio}
            onChange={(e) => setRatio(e.target.value)}
            className="w-full rounded-lg p-2.5 text-sm font-rajdhani focus:outline-none"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="1:1">1:1 (Square)</option>
            <option value="16:9">16:9 (Landscape)</option>
            <option value="9:16">9:16 (Portrait)</option>
          </select>

          <label className="block text-sm font-medium mb-1.5 mt-3" style={{ color: "var(--text)" }}>
            Video Style
          </label>
          <select
            value={videoMode}
            onChange={(e) => setVideoMode(e.target.value)}
            className="w-full rounded-lg p-2.5 text-sm font-rajdhani focus:outline-none"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="normal">Standard Realistic</option>
            <option value="fun">Fun Cartoon</option>
            <option value="spicy">Spicy Mode</option>
          </select>
        </div>

        {/* Upload Zone */}
        <div className="mb-4">
          <div className="text-sm uppercase tracking-wider font-semibold mb-3 pb-1" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
            Reference Image (Optional)
          </div>
          <div
            className="rounded-lg p-5 text-center cursor-pointer transition-all min-h-20 flex flex-col items-center justify-center hover:opacity-80"
            style={{
              border: "2px dashed var(--border)",
              background: "rgba(255,255,255,0.02)",
            }}
            onClick={() => {
              if (!uploadedImageUrl && fileInputRef.current) fileInputRef.current.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--neon-blue)";
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--border)";
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--border)";
              if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files[0]);
            }}
          >
            {uploading ? (
              <div className="flex items-center gap-2 neon-text">
                <i className="fas fa-spinner fa-spin" /> Uploading...
              </div>
            ) : uploadedImageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedImageUrl}
                  alt="Preview"
                  className="max-h-28 max-w-full rounded-lg"
                  style={{ border: "2px solid var(--neon-blue)" }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteImage();
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs cursor-pointer border-0 hover:bg-red-600"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            ) : (
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                <i className="fas fa-cloud-upload-alt text-2xl mb-2 block neon-text" />
                Click or drag and drop an image here
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleUpload(e.target.files[0]);
            }}
          />
          <div
            className="text-xs mt-2 text-center p-2 rounded glass-bg"
            style={{ color: "var(--text-secondary)" }}
          >
            <i className={`fas ${uploadedImageUrl ? "fa-magic" : "fa-keyboard"} mr-1`} />
            {uploadedImageUrl ? "Mode: Image to Video" : "Mode: Text to Video"}
          </div>
        </div>

        {/* Prompt */}
        <div className="flex-1 flex flex-col mb-4">
          <div className="text-sm uppercase tracking-wider font-semibold mb-3 pb-1" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
            Creative Prompt
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={1800}
            rows={4}
            placeholder="Enter your creative description here..."
            className="w-full rounded-lg p-3 text-sm font-rajdhani resize-none focus:outline-none"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          <div
            className={`flex justify-between text-xs mt-2 p-2 rounded glass-bg ${
              charCount >= 1800 ? "text-red-500" : charCount >= 1600 ? "text-amber-500" : ""
            }`}
            style={{ color: charCount < 1600 ? "var(--text-secondary)" : undefined }}
          >
            <span>{charCount} / 1800</span>
            <span>Character Limit</span>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={submitTask}
          disabled={!prompt.trim() || tasks.some((t) => t.status === "processing")}
          className="w-full gradient-btn border-0 p-4 font-orbitron font-bold text-white text-base cursor-pointer rounded-lg uppercase tracking-widest transition-all hover:brightness-110 hover:-translate-y-0.5 disabled:grayscale disabled:cursor-not-allowed disabled:translate-y-0"
        >
          <i className="fas fa-play mr-2" />
          Generate
        </button>
      </div>

      {/* Main Gallery Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="glass-panel p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="lg:hidden w-8" />
            <h2 className="font-orbitron text-sm neon-text tracking-wider">
              <i className="fas fa-film mr-2" />
              GENERATION GALLERY
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span className="glass-bg px-3 py-1.5 rounded-full" style={{ border: "1px solid var(--border)" }}>
              <i className="fas fa-video mr-1 neon-text" />
              {allItems.length} items
            </span>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 p-4 xl:p-6 overflow-y-auto">
          {allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <i className="fas fa-magic text-6xl mb-4 animate-pulse-glow neon-text" />
              <h3 className="font-orbitron text-xl mb-2 neon-text">Ready to Create</h3>
              <p className="text-sm max-w-md" style={{ color: "var(--text-secondary)" }}>
                Enter a creative prompt in the sidebar and click Generate to start creating amazing AI-powered videos
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {allItems.map((item) => (
                <div
                  key={item.id}
                  className="glass-panel rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                  style={{ borderColor: item.status === "completed" ? "var(--neon-blue)" : "var(--border)" }}
                >
                  {/* Media Container */}
                  <div className="w-full aspect-video relative overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)" }}>
                    {item.status === "completed" && item.urls && item.urls.length > 0 ? (
                      <video
                        src={item.urls[0]}
                        controls
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : item.status === "failed" ? (
                      <div className="flex flex-col items-center gap-2 p-5 text-red-500 text-center">
                        <i className="fas fa-exclamation-triangle text-3xl" />
                        <span className="text-sm">Generation Failed</span>
                        <span className="text-xs opacity-70">{item.error}</span>
                      </div>
                    ) : (
                      <>
                        {item.refImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.refImage} alt="ref" className="w-full h-full object-cover opacity-30" />
                        )}
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                          <div className="w-10 h-10 rounded-full animate-spin" style={{ border: "3px solid var(--neon-blue)", borderTopColor: "transparent" }} />
                          <div className="text-xs neon-text">
                            {item.status === "pending" ? "Initializing..." : "Rendering..."}
                          </div>
                          <div className="text-sm" style={{ color: "var(--text)" }}>Poll #{item.pollCount}</div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1.5" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div
                            className="h-full transition-all duration-300 gradient-btn"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4" style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.05) 0%, rgba(255,0,255,0.02) 100%)" }}>
                    <p className="text-sm mb-2 line-clamp-2" style={{ color: "var(--text)" }}>
                      {item.prompt}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-xs mb-3">
                      <span className="glass-bg px-2 py-1 rounded-full" style={{ border: "1px solid var(--border)" }}>
                        <i className="fas fa-film mr-1 neon-text" />
                        {item.model}
                      </span>
                      <span className="glass-bg px-2 py-1 rounded-full" style={{ border: "1px solid var(--border)" }}>
                        <i className="fas fa-expand mr-1 neon-text" />
                        {item.ratio}
                      </span>
                    </div>

                    {/* Actions */}
                    {item.status === "completed" && item.urls && item.urls.length > 0 && (
                      <div className="flex gap-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <button
                          onClick={() => downloadVideo(item.urls![0])}
                          className="flex-1 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer border-0 text-black"
                          style={{ background: "var(--neon-blue)" }}
                        >
                          <i className="fas fa-download" /> Download
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="flex-1 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer border-0 bg-red-500 text-white hover:bg-red-600"
                        >
                          <i className="fas fa-trash" /> Delete
                        </button>
                      </div>
                    )}
                    {item.status === "failed" && (
                      <div className="flex gap-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="flex-1 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer border-0 bg-red-500 text-white hover:bg-red-600"
                        >
                          <i className="fas fa-trash" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <div
        className={`fixed top-5 right-5 glass-panel px-5 py-3 z-50 rounded transition-transform duration-300 ${
          toast ? "translate-x-0" : "translate-x-[150%]"
        }`}
        style={{ borderLeft: "4px solid var(--neon-blue)" }}
      >
        {toast}
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
