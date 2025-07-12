'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCode, Trash2, AlertCircle, CheckCircle, Pencil, Eye, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { GlowInput } from '@/components/GlowInput';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { generateWorkerTemplate } from '@/lib/worker-template';

interface ScriptData {
  _id: string;
  scriptName: string;
  keywords: string[];
  whitelistPaths: string[];
  createdAt: string;
  updatedAt: string;
  enableAlert?: boolean;
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingScript, setEditingScript] = useState<ScriptData | null>(null);
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editPaths, setEditPaths] = useState<string[]>([]);
  const [editScriptName, setEditScriptName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newScriptName, setNewScriptName] = useState('');
  const [newKeywords, setNewKeywords] = useState<string[]>(['']);
  const [newPaths, setNewPaths] = useState<string[]>(['']);
  const [newEnableAlert, setNewEnableAlert] = useState(false);
  const [editEnableAlert, setEditEnableAlert] = useState(false);
  const [previewScript, setPreviewScript] = useState<ScriptData | null>(null);
  const [triggerAlertEnabled, setTriggerAlertEnabled] = useState(false);
  // Tambahkan hook untuk deteksi mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkDark = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
      checkDark();
      const observer = new MutationObserver(checkDark);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    fetchScripts();
    fetchTriggerAlertStatus();
  }, []);

  const fetchTriggerAlertStatus = async () => {
    try {
      const response = await fetch('/api/trigger/config');
      if (response.ok) {
        const data = await response.json();
        setTriggerAlertEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Failed to fetch trigger alert status:', error);
    }
  };

  const fetchScripts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scripts');
      if (response.ok) {
        const data = await response.json();
        setScripts(data);
      }
    } catch (error) {
      toast.error('Failed to load scripts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteScript = async (scriptId: string) => {
    setDeletingId(scriptId);
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Script deleted successfully');
        fetchScripts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete script');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (script: ScriptData) => {
    setEditingScript(script);
    setEditScriptName(script.scriptName);
    setEditKeywords([...script.keywords]);
    setEditPaths([...script.whitelistPaths]);
    setEditEnableAlert(script.enableAlert || false);
  };

  const closeEditModal = () => {
    setEditingScript(null);
    setEditScriptName('');
    setEditKeywords([]);
    setEditPaths([]);
    setEditEnableAlert(false);
  };

  const handleEditKeywordChange = (i: number, value: string) => {
    const newKeywords = [...editKeywords];
    newKeywords[i] = value;
    setEditKeywords(newKeywords);
  };

  const handleEditPathChange = (i: number, value: string) => {
    const newPaths = [...editPaths];
    newPaths[i] = value;
    setEditPaths(newPaths);
  };

  const handleAddEditKeyword = () => setEditKeywords([...editKeywords, '']);
  const handleRemoveEditKeyword = (i: number) => setEditKeywords(editKeywords.filter((_, idx) => idx !== i));
  const handleAddEditPath = () => setEditPaths([...editPaths, '']);
  const handleRemoveEditPath = (i: number) => setEditPaths(editPaths.filter((_, idx) => idx !== i));

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScript) return;
    setIsEditing(true);
    try {
      const response = await fetch(`/api/scripts/${editingScript._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptName: editScriptName,
          keywords: editKeywords.filter(k => k.trim()),
          whitelistPaths: editPaths.filter(p => p.trim()),
          enableAlert: editEnableAlert
        }),
      });
      if (response.ok) {
        toast.success('Script updated successfully!');
        closeEditModal();
        fetchScripts();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update script');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsEditing(false);
    }
  };

  const handleNewKeywordChange = (i: number, value: string) => {
    const updatedKeywords = [...newKeywords];
    updatedKeywords[i] = value;
    setNewKeywords(updatedKeywords);
  };

  const handleNewPathChange = (i: number, value: string) => {
    const updatedPaths = [...newPaths];
    updatedPaths[i] = value;
    setNewPaths(updatedPaths);
  };

  const handleAddNewKeyword = () => setNewKeywords([...newKeywords, '']);
  const handleRemoveNewKeyword = (i: number) => setNewKeywords(newKeywords.filter((_, idx) => idx !== i));
  const handleAddNewPath = () => setNewPaths([...newPaths, '']);
  const handleRemoveNewPath = (i: number) => setNewPaths(newPaths.filter((_, idx) => idx !== i));

  const handleAddScript = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptName: newScriptName,
          keywords: newKeywords.filter(k => k.trim()),
          whitelistPaths: newPaths.filter(p => p.trim()),
          enableAlert: newEnableAlert
        }),
      });
      if (res.ok) {
        toast.success('Script created successfully!');
        setShowAddModal(false);
        setNewScriptName('');
        setNewKeywords(['']);
        setNewPaths(['']);
        setNewEnableAlert(false);
        fetchScripts();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create script');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const generateScriptPreview = (script: ScriptData) => {
    return generateWorkerTemplate({
      scriptName: script.scriptName,
      keywords: script.keywords,
      whitelistPaths: script.whitelistPaths || [],
      enableAlert: script.enableAlert || false,
      baseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">Manage Scripts</h1>
          <p className="text-muted-foreground mt-2">Manage Cloudflare Worker scripts and their configurations</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddModal(true)}>
              Add Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Script</DialogTitle>
              <DialogDescription>Create a worker script for filtering and blocking based on keywords and paths.</DialogDescription>
            </DialogHeader>
            {!triggerAlertEnabled && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Trigger Alert in Overview disabled.</strong> Script alerts will not function until you enable Trigger Alert in the dashboard overview.
                </p>
              </div>
            )}
            <form onSubmit={handleAddScript} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Script Name</label>
                <GlowInput 
                  value={newScriptName} 
                  onChange={e => setNewScriptName(e.target.value)} 
                  placeholder="my-filter-script" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Keywords (for blocking)</label>
                <div className="space-y-2">
                  {newKeywords.map((keyword, i) => (
                    <div key={i} className="flex gap-2">
                      <GlowInput
                        value={keyword}
                        onChange={e => handleNewKeywordChange(i, e.target.value)}
                        placeholder="keyword"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveNewKeyword(i)}
                        disabled={newKeywords.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddNewKeyword}>
                    + Add Keyword
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Whitelist Paths (optional)</label>
                <div className="space-y-2">
                  {newPaths.map((path, i) => (
                    <div key={i} className="flex gap-2">
                      <GlowInput
                        value={path}
                        onChange={e => handleNewPathChange(i, e.target.value)}
                        placeholder="/api/*"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveNewPath(i)}
                        disabled={newPaths.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddNewPath}>
                    + Add Path
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="newEnableAlert" 
                  checked={newEnableAlert} 
                  onCheckedChange={(checked) => setNewEnableAlert(checked as boolean)}
                />
                <Label htmlFor="newEnableAlert" className="text-sm font-medium">
                  Enable Alert
                </Label>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)} disabled={isAdding}>
                  Cancel
                </Button>
                <Button className="bg-orange-500 hover:bg-orange-600" type="submit" disabled={isAdding}>
                  {isAdding ? 'Saving...' : 'Save Script'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!triggerAlertEnabled && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Trigger Alert in Overview disabled.</strong> Script alerts will not function until you enable Trigger Alert in the dashboard overview.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {scripts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No scripts yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                No scripts are registered yet. Create a new script to start managing your Cloudflare Workers.
              </p>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddModal(true)}>
                Add Script
              </Button>
            </CardContent>
          </Card>
        ) : (
          scripts.map((script, index) => (
            <motion.div
              key={script._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                        <FileCode className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{script.scriptName}</CardTitle>
                        <CardDescription>
                          {script.keywords.length} keywords • {script.whitelistPaths.length} whitelist paths
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={previewScript?._id === script._id} onOpenChange={(open) => !open && setPreviewScript(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-green-500 hover:text-green-700" onClick={() => setPreviewScript(script)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Preview Script: {script.scriptName}</DialogTitle>
                            <DialogDescription>
                              Preview worker script code that will be generated.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                            <SyntaxHighlighter
                              language="javascript"
                              style={vscDarkPlus}
                              customStyle={{ background: 'transparent', margin: 0, padding: 0 }}
                            >
                              {generateScriptPreview(script)}
                            </SyntaxHighlighter>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={editingScript?._id === script._id} onOpenChange={(open) => !open && closeEditModal()}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-blue-500 hover:text-blue-700" onClick={() => openEditModal(script)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Script</DialogTitle>
                            <DialogDescription>
                              Change script name, keywords, or whitelist paths.
                            </DialogDescription>
                          </DialogHeader>
                          {!triggerAlertEnabled && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                ⚠️ <strong>Trigger Alert in Overview disabled.</strong> Script alerts will not function until you enable Trigger Alert in the dashboard overview.
                              </p>
                            </div>
                          )}
                          <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Script Name</label>
                              <GlowInput 
                                value={editScriptName} 
                                onChange={e => setEditScriptName(e.target.value)} 
                                placeholder="my-filter-script" 
                                required 
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Keywords (for blocking)</label>
                              <div className="space-y-2">
                                {editKeywords.map((keyword, i) => (
                                  <div key={i} className="flex gap-2">
                                    <GlowInput
                                      value={keyword}
                                      onChange={e => handleEditKeywordChange(i, e.target.value)}
                                      placeholder="keyword"
                                      required
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemoveEditKeyword(i)}
                                      disabled={editKeywords.length === 1}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={handleAddEditKeyword}>
                                  + Add Keyword
                                </Button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Whitelist Paths (optional)</label>
                              <div className="space-y-2">
                                {editPaths.map((path, i) => (
                                  <div key={i} className="flex gap-2">
                                    <GlowInput
                                      value={path}
                                      onChange={e => handleEditPathChange(i, e.target.value)}
                                      placeholder="/api/*"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemoveEditPath(i)}
                                      disabled={editPaths.length === 1}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={handleAddEditPath}>
                                  + Add Path
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="editEnableAlert" 
                                checked={editEnableAlert} 
                                onCheckedChange={(checked) => setEditEnableAlert(checked as boolean)}
                              />
                              <Label htmlFor="editEnableAlert" className="text-sm font-medium">
                                Enable Alert
                              </Label>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" type="button" onClick={closeEditModal} disabled={isEditing}>
                                Cancel
                              </Button>
                              <Button className="bg-orange-500 hover:bg-orange-600" type="submit" disabled={isEditing}>
                                {isEditing ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Script</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this script? This action cannot be undone and will affect all routes using this script.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteScript(script._id)}
                              className="bg-red-500 hover:bg-red-600"
                              disabled={deletingId === script._id}
                            >
                              {deletingId === script._id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {script.keywords.map((keyword, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Whitelist Paths</h4>
                      <div className="flex flex-wrap gap-1">
                        {script.whitelistPaths.length > 0
                          ? script.whitelistPaths.map((path, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {path}
                              </Badge>
                            ))
                          : <span className="text-xs text-muted-foreground">None</span>
                        }
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Alert Status</h4>
                      <Badge 
                        variant={script.enableAlert ? "default" : "secondary"} 
                        className={`text-xs ${script.enableAlert ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'}`}
                      >
                        {script.enableAlert ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Created: {formatDistanceToNow(new Date(script.createdAt), { addSuffix: true })}
                      {script.updatedAt !== script.createdAt && (
                        <span className="ml-4">
                          Updated: {formatDistanceToNow(new Date(script.updatedAt), { addSuffix: true })}
                        </span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
} 