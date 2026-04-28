import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  Book, 
  HelpCircle, 
  ExternalLink, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Search,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Download,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { Progress } from "@/components/ui/progress";

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: string;
  tags: string[];
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ResourceLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  icon: string;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface DownloadableFile {
  id: string;
  title: string;
  description?: string;
  category: string;
  platform?: "windows" | "mac" | "other";
  version?: string;
  minOs?: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface DownloadAnalytics {
  totals: {
    allTime: number;
    last7Days: number;
    last30Days: number;
    windows: number;
    mac: number;
    fromUserPanel: number;
  };
  recentEvents: Array<{
    id: string;
    createdAt: string;
    platform: string;
    source: string;
    fileTitle: string;
    version?: string | null;
  }>;
}

export const ResourceCentreAdmin: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const readOnlyHelpApiNotice = "This environment currently supports read-only help content. Create/publish APIs for articles, FAQs, and resources are not deployed.";
  
  const [activeTab, setActiveTab] = useState("articles");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [uploadingPlatform, setUploadingPlatform] = useState<"windows" | "mac" | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [platform: string]: number }>({});

  // Form states
  const [articleForm, setArticleForm] = useState<Partial<HelpArticle>>({
    title: "",
    description: "",
    category: "getting-started",
    readTime: "",
    difficulty: "beginner",
    content: "",
    tags: [],
    published: false
  });

  const [faqForm, setFaqForm] = useState<Partial<FAQItem>>({
    question: "",
    answer: "",
    category: "general",
    published: false
  });

  const [resourceForm, setResourceForm] = useState<Partial<ResourceLink>>({
    title: "",
    description: "",
    url: "",
    category: "general",
    icon: "ExternalLink",
    published: false
  });
  const [desktopReleaseForm, setDesktopReleaseForm] = useState({
    windowsVersion: "",
    windowsMinOs: "Requires Windows 10 or 11 (64-bit)",
    windowsFile: null as File | null,
    macVersion: "",
    macMinOs: "Apple Silicon & Intel (macOS 12.0+)",
    macFile: null as File | null
  });

  // Categories
  const categories = [
    { value: "getting-started", label: "Getting Started" },
    { value: "bible-companion", label: "Bible Companion" },
    { value: "presentations", label: "Presentations" },
    { value: "billing", label: "Billing & Plans" },
    { value: "organization", label: "Organization" },
    { value: "troubleshooting", label: "Troubleshooting" },
    { value: "general", label: "General" }
  ];

  // Fetch help content from existing public help endpoints.
  const { data: articlesData } = useQuery({
    queryKey: ['/api/help/articles'],
    queryFn: async () => {
      const response = await fetch('/api/help/articles');
      return await response.json();
    }
  });

  const { data: faqsData } = useQuery({
    queryKey: ['/api/help/faqs'],
    queryFn: async () => {
      const response = await fetch('/api/help/faqs');
      return await response.json();
    }
  });

  const { data: resourcesData } = useQuery({
    queryKey: ['/api/help/resources'],
    queryFn: async () => {
      const response = await fetch('/api/help/resources');
      return await response.json();
    }
  });
  const { data: downloadableFilesData } = useQuery({
    queryKey: ['/api/admin/download-files'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/download-files');
      return await response.json();
    }
  });
  const { data: downloadAnalyticsData } = useQuery<DownloadAnalytics>({
    queryKey: ['/api/admin/download-files/analytics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/download-files/analytics');
      return await response.json();
    }
  });

  const articles = articlesData?.articles || [];
  const faqs = faqsData?.faqs || [];
  const resources = resourcesData?.resources || [];
  const downloadableFiles = (downloadableFilesData?.files || []) as DownloadableFile[];
  const windowsBuild = downloadableFiles.find((file) => file.platform === "windows");
  const macBuild = downloadableFiles.find((file) => file.platform === "mac");
  const analytics = downloadAnalyticsData?.totals;
  const recentDownloadEvents = downloadAnalyticsData?.recentEvents || [];

  // Download release mutations (supported by deployed admin API)
  const uploadDownloadMutation = useMutation({
    mutationFn: async (payload: {
      platform: "windows" | "mac";
      file: File | null;
      version: string;
      minOs: string;
    }) => {
      if (!payload.file) {
        throw new Error("Please select a file to upload.");
      }

      setUploadProgress(prev => ({ ...prev, [payload.platform]: 0 }));
      try {
        // Step 1: Get presigned URL
        const presignedRes = await apiRequest('POST', '/api/admin/download-files/presigned-url', {
          filename: payload.file.name,
          mimeType: payload.file.type || 'application/octet-stream'
        });
        const { presignedUrl, key } = await presignedRes.json();

        // Step 2: Upload directly to S3
        await axios.put(presignedUrl, payload.file, {
          headers: {
            'Content-Type': payload.file.type || 'application/octet-stream'
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(prev => ({ ...prev, [payload.platform]: percentCompleted }));
            }
          }
        });

        // Step 3: Confirm upload
        const confirmRes = await apiRequest('POST', '/api/admin/download-files/confirm', {
          key,
          title: payload.file.name,
          description: `${payload.platform.toUpperCase()} desktop installer`,
          category: "desktop-installers",
          platform: payload.platform,
          version: payload.version,
          minOs: payload.minOs,
          originalName: payload.file.name,
          mimeType: payload.file.type || 'application/octet-stream',
          fileSize: payload.file.size,
          isPublished: true
        });

        return await confirmRes.json();
      } finally {
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[payload.platform];
            return newProgress;
          });
        }, 2000);
      }
    },
    onSuccess: () => {
      toast({ title: "Download file uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/download-files'] });
    },
    onMutate: async (payload) => {
      setUploadingPlatform(payload.platform);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload this file.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setUploadingPlatform(null);
    }
  });
  const isUploading = uploadDownloadMutation.isPending;
  const isUploadingWindows = isUploading && uploadingPlatform === "windows";
  const isUploadingMac = isUploading && uploadingPlatform === "mac";

  const toggleDownloadPublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/download-files/${id}`, { isPublished });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/download-files'] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Could not change publish status.",
        variant: "destructive"
      });
    }
  });

  const deleteDownloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/download-files/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Download file deleted" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/download-files'] });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Could not delete this file.",
        variant: "destructive"
      });
    }
  });

  const handleCreateItem = () => {
    toast({
      title: "Create unavailable",
      description: readOnlyHelpApiNotice,
      variant: "destructive",
    });
  };

  const handlePublishToggle = async (type: string, id: string, currentStatus: boolean) => {
    toast({
      title: "Publish toggle unavailable",
      description: readOnlyHelpApiNotice,
      variant: "destructive",
    });
  };

  const filteredData = (data: any[]) => {
    return data.filter(item => {
      const searchMatch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return searchMatch;
    });
  };
  const formatFileSizeMb = (bytes?: number) =>
    bytes && bytes > 0 ? `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB` : "N/A";

  const renderStats = () => {
    const stats = {
      articles: { total: articles.length, published: articles.filter((a: any) => a.published).length },
      faqs: { total: faqs.length, published: faqs.filter((f: any) => f.published).length },
      resources: { total: resources.length, published: resources.filter((r: any) => r.published).length }
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Book className="w-4 h-4" />
              Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.articles.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{stats.articles.published} published</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              FAQs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.faqs.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{stats.faqs.published} published</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resources.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{stats.resources.published} published</div>
          </CardContent>
        </Card>

      </div>
    );
  };

  const renderPreviewDialog = () => (
    <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
      <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Preview {previewItem?.title || previewItem?.question}
          </DialogTitle>
        </DialogHeader>
        
        {previewItem && (
          <div className="space-y-4">
            {previewItem.title && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{previewItem.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{previewItem.description}</p>
                {previewItem.readTime && (
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>Read time: {previewItem.readTime}</span>
                    <Badge className={previewItem.difficulty === 'beginner' ? 'bg-green-900/40 text-green-400' : 
                                    previewItem.difficulty === 'intermediate' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-red-900/40 text-red-400'}>
                      {previewItem.difficulty}
                    </Badge>
                  </div>
                )}
                {previewItem.content && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded border max-h-96 overflow-y-auto">
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{previewItem.content}</div>
                  </div>
                )}
              </div>
            )}
            
            {previewItem.question && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{previewItem.question}</h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded border">
                  <p className="text-gray-700 dark:text-gray-300">{previewItem.answer}</p>
                </div>
                {(previewItem.helpful || previewItem.notHelpful) && (
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-4">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {previewItem.helpful || 0} helpful
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown className="w-4 h-4" />
                      {previewItem.notHelpful || 0} not helpful
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {previewItem.url && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{previewItem.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{previewItem.description}</p>
                <a 
                  href={previewItem.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  {previewItem.url}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <Badge variant={previewItem.published ? "default" : "secondary"}>
                  {previewItem.published ? "Published" : "Draft"}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Category: {categories.find(c => c.value === previewItem.category)?.label}
                </span>
              </div>
              <Button variant="outline" onClick={() => setPreviewItem(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const renderEditDialog = () => (
    <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
      <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit {editingItem?.title || editingItem?.question}
          </DialogTitle>
        </DialogHeader>
        
        {editingItem && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Edit functionality will be implemented in a future update. For now, you can view the content above.
            </p>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const renderCreateDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create New {activeTab === "articles" ? "Article" : activeTab === "faqs" ? "FAQ" : "Resource"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {activeTab === "articles" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={articleForm.title || ""}
                    onChange={(e) => setArticleForm({...articleForm, title: e.target.value})}
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={articleForm.category}
                    onValueChange={(value) => setArticleForm({...articleForm, category: value})}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Read Time</Label>
                  <Input
                    value={articleForm.readTime || ""}
                    onChange={(e) => setArticleForm({...articleForm, readTime: e.target.value})}
                    placeholder="e.g., 5 min"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={articleForm.difficulty}
                    onValueChange={(value: any) => setArticleForm({...articleForm, difficulty: value})}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={articleForm.description || ""}
                  onChange={(e) => setArticleForm({...articleForm, description: e.target.value})}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Content</Label>
                <Textarea
                  value={articleForm.content || ""}
                  onChange={(e) => setArticleForm({...articleForm, content: e.target.value})}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  rows={10}
                  placeholder="Enter the full article content..."
                />
              </div>
            </>
          )}
          
          {activeTab === "faqs" && (
            <>
              <div>
                <Label>Question</Label>
                <Input
                  value={faqForm.question || ""}
                  onChange={(e) => setFaqForm({...faqForm, question: e.target.value})}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <Label>Category</Label>
                <Select
                  value={faqForm.category}
                  onValueChange={(value) => setFaqForm({...faqForm, category: value})}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Answer</Label>
                <Textarea
                  value={faqForm.answer || ""}
                  onChange={(e) => setFaqForm({...faqForm, answer: e.target.value})}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  rows={6}
                />
              </div>
            </>
          )}
          
          {activeTab === "resources" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={resourceForm.title || ""}
                    onChange={(e) => setResourceForm({...resourceForm, title: e.target.value})}
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={resourceForm.category}
                    onValueChange={(value) => setResourceForm({...resourceForm, category: value})}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>URL</Label>
                <Input
                  value={resourceForm.url || ""}
                  onChange={(e) => setResourceForm({...resourceForm, url: e.target.value})}
                  placeholder="https://..."
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={resourceForm.description || ""}
                  onChange={(e) => setResourceForm({...resourceForm, description: e.target.value})}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={
                activeTab === "articles" ? articleForm.published :
                activeTab === "faqs" ? faqForm.published :
                resourceForm.published
              }
              onChange={(e) => {
                if (activeTab === "articles") {
                  setArticleForm({...articleForm, published: e.target.checked});
                } else if (activeTab === "faqs") {
                  setFaqForm({...faqForm, published: e.target.checked});
                } else {
                  setResourceForm({...resourceForm, published: e.target.checked});
                }
              }}
              className="rounded"
            />
            <Label>Publish immediately</Label>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreateItem} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              Create {activeTab === "articles" ? "Article" : activeTab === "faqs" ? "FAQ" : "Resource"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Resource Centre</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage all Help & Support content for users</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-md">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Desktop App Releases (Public Download Page)</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload one Windows installer and one macOS installer. The latest published file per platform appears on the public download page.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Windows Build</h3>
                <Badge variant={windowsBuild?.isPublished ? "default" : "secondary"}>
                  {windowsBuild ? "Published" : "Not published"}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Current: {windowsBuild?.version || "None"}</p>
                <p>File: {windowsBuild?.originalName || "N/A"}</p>
                <p>Size: {formatFileSizeMb(windowsBuild?.fileSize)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Version *</Label>
              <Input
                placeholder="Version e.g. v2.4.1"
                value={desktopReleaseForm.windowsVersion}
                onChange={(e) => setDesktopReleaseForm((prev) => ({ ...prev, windowsVersion: e.target.value }))}
                className="bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Minimum OS *</Label>
              <Input
                placeholder="Minimum OS"
                value={desktopReleaseForm.windowsMinOs}
                onChange={(e) => setDesktopReleaseForm((prev) => ({ ...prev, windowsMinOs: e.target.value }))}
                className="bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Installer File *</Label>
              <Input
                type="file"
                accept=".exe,.msi"
                onChange={(e) =>
                  setDesktopReleaseForm((prev) => ({
                    ...prev,
                    windowsFile: e.target.files && e.target.files.length > 0 ? e.target.files[0] : null
                  }))
                }
                className="bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white file:mr-3 file:rounded-md file:border-0 file:bg-purple-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-purple-900 dark:file:bg-purple-900/40 dark:file:text-purple-200"
              />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Allowed: <span className="font-medium">.exe, .msi</span>
                  {desktopReleaseForm.windowsFile ? ` • Selected: ${desktopReleaseForm.windowsFile.name}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={isUploading || !desktopReleaseForm.windowsFile || !desktopReleaseForm.windowsVersion.trim()}
                  onClick={() =>
                    uploadDownloadMutation.mutate({
                      platform: "windows",
                      file: desktopReleaseForm.windowsFile,
                      version: desktopReleaseForm.windowsVersion,
                      minOs: desktopReleaseForm.windowsMinOs
                    })
                  }
                >
                  {isUploadingWindows ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading Windows...
                    </>
                  ) : (
                    "Upload Windows"
                  )}
                </Button>
                {isUploadingWindows && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 self-center">
                    Upload in progress... please wait.
                  </p>
                )}
                {windowsBuild && (
                  <>
                    <Button
                      variant={windowsBuild.isPublished ? "destructive" : "default"}
                      disabled={isUploading}
                      onClick={() =>
                        toggleDownloadPublishMutation.mutate({ id: windowsBuild.id, isPublished: !windowsBuild.isPublished })
                      }
                    >
                      {windowsBuild.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                    <Button variant="destructive" disabled={isUploading} onClick={() => deleteDownloadMutation.mutate(windowsBuild.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
              {typeof uploadProgress["windows"] === "number" && (
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress["windows"]}%</span>
                  </div>
                  <Progress value={uploadProgress["windows"]} className="h-2" />
                </div>
              )}
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">macOS Build</h3>
                <Badge variant={macBuild?.isPublished ? "default" : "secondary"}>
                  {macBuild ? "Published" : "Not published"}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Current: {macBuild?.version || "None"}</p>
                <p>File: {macBuild?.originalName || "N/A"}</p>
                <p>Size: {formatFileSizeMb(macBuild?.fileSize)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Version *</Label>
              <Input
                placeholder="Version e.g. v2.4.1"
                value={desktopReleaseForm.macVersion}
                onChange={(e) => setDesktopReleaseForm((prev) => ({ ...prev, macVersion: e.target.value }))}
                className="bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Minimum OS *</Label>
              <Input
                placeholder="Minimum OS"
                value={desktopReleaseForm.macMinOs}
                onChange={(e) => setDesktopReleaseForm((prev) => ({ ...prev, macMinOs: e.target.value }))}
                className="bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Installer File *</Label>
              <Input
                type="file"
                accept=".dmg,.pkg"
                onChange={(e) =>
                  setDesktopReleaseForm((prev) => ({
                    ...prev,
                    macFile: e.target.files && e.target.files.length > 0 ? e.target.files[0] : null
                  }))
                }
                className="bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white file:mr-3 file:rounded-md file:border-0 file:bg-purple-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-purple-900 dark:file:bg-purple-900/40 dark:file:text-purple-200"
              />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Allowed: <span className="font-medium">.dmg, .pkg</span>
                  {desktopReleaseForm.macFile ? ` • Selected: ${desktopReleaseForm.macFile.name}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={isUploading || !desktopReleaseForm.macFile || !desktopReleaseForm.macVersion.trim()}
                  onClick={() =>
                    uploadDownloadMutation.mutate({
                      platform: "mac",
                      file: desktopReleaseForm.macFile,
                      version: desktopReleaseForm.macVersion,
                      minOs: desktopReleaseForm.macMinOs
                    })
                  }
                >
                  {isUploadingMac ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading macOS...
                    </>
                  ) : (
                    "Upload macOS"
                  )}
                </Button>
                {isUploadingMac && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 self-center">
                    Upload in progress... please wait.
                  </p>
                )}
                {macBuild && (
                  <>
                    <Button
                      variant={macBuild.isPublished ? "destructive" : "default"}
                      disabled={isUploading}
                      onClick={() =>
                        toggleDownloadPublishMutation.mutate({ id: macBuild.id, isPublished: !macBuild.isPublished })
                      }
                    >
                      {macBuild.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                    <Button variant="destructive" disabled={isUploading} onClick={() => deleteDownloadMutation.mutate(macBuild.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
              {typeof uploadProgress["mac"] === "number" && (
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress["mac"]}%</span>
                  </div>
                  <Progress value={uploadProgress["mac"]} className="h-2" />
                </div>
              )}

            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-md">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Tracking
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tracks every download event from the user panel and desktop download links.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">All-Time Downloads</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{analytics?.allTime ?? 0}</p>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Last 7 Days</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{analytics?.last7Days ?? 0}</p>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Last 30 Days</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{analytics?.last30Days ?? 0}</p>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Windows Downloads</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{analytics?.windows ?? 0}</p>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">macOS Downloads</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{analytics?.mac ?? 0}</p>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">User Panel Source</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{analytics?.fromUserPanel ?? 0}</p>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 dark:border-gray-700">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Recent Download Events</p>
            </div>
            <div className="max-h-64 overflow-auto">
              {recentDownloadEvents.length === 0 ? (
                <p className="p-3 text-sm text-gray-500 dark:text-gray-400">No downloads recorded yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentDownloadEvents.map((event) => (
                    <div key={event.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{event.fileTitle}</p>
                        <Badge variant="secondary">{event.platform}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Source: {event.source} • {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {renderStats()}

      {/* Search */}
      <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-100 dark:bg-gray-900">
          <TabsTrigger value="articles" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Book className="w-4 h-4 mr-2" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="faqs" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <HelpCircle className="w-4 h-4 mr-2" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <ExternalLink className="w-4 h-4 mr-2" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Articles ({filteredData(articles).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData(articles).map((article) => (
                  <div key={article.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{article.title}</h3>
                          <Badge variant={article.published ? "default" : "secondary"}>
                            {article.published ? "Published" : "Draft"}
                          </Badge>
                          <Badge className={`${
                            article.difficulty === 'beginner' ? 'bg-green-900/40 text-green-400' :
                            article.difficulty === 'intermediate' ? 'bg-yellow-900/40 text-yellow-400' :
                            'bg-red-900/40 text-red-400'
                          }`}>
                            {article.difficulty}
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{article.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{categories.find(c => c.value === article.category)?.label}</span>
                          <span>{article.readTime}</span>
                          <span>Updated: {article.updatedAt}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPreviewItem(article)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(article)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={article.published ? "destructive" : "default"}
                          onClick={() => handlePublishToggle("articles", article.id, article.published)}
                        >
                          {article.published ? "Unpublish" : "Publish"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">FAQs ({filteredData(faqs).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData(faqs).map((faq) => (
                  <div key={faq.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{faq.question}</h3>
                          <Badge variant={faq.published ? "default" : "secondary"}>
                            {faq.published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">{faq.answer}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{categories.find(c => c.value === faq.category)?.label}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {faq.helpful}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsDown className="w-3 h-3" />
                            {faq.notHelpful}
                          </span>
                          <span>Updated: {faq.updatedAt}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPreviewItem(faq)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(faq)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={faq.published ? "destructive" : "default"}
                          onClick={() => handlePublishToggle("faqs", faq.id, faq.published)}
                        >
                          {faq.published ? "Unpublish" : "Publish"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Resources ({filteredData(resources).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData(resources).map((resource) => (
                  <div key={resource.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{resource.title}</h3>
                          <Badge variant={resource.published ? "default" : "secondary"}>
                            {resource.published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{resource.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{categories.find(c => c.value === resource.category)?.label}</span>
                          <span className="text-blue-600 dark:text-blue-400">{resource.url}</span>
                          <span>Updated: {resource.updatedAt}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => window.open(resource.url, '_blank')}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(resource)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={resource.published ? "destructive" : "default"}
                          onClick={() => handlePublishToggle("resources", resource.id, resource.published)}
                        >
                          {resource.published ? "Unpublish" : "Publish"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Dialogs */}
      {renderCreateDialog()}
      {renderPreviewDialog()}
      {renderEditDialog()}
    </div>
  );
};