'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, Trash2, AlertCircle, CheckCircle, Pencil } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface RouteData {
  _id: string;
  zoneName: string;
  routePattern: string;
  scriptName: string;
  script?: {
    scriptName: string;
    keywords: string[];
    whitelistPaths: string[];
  };
  deployedAt: string;
  status: string;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editPaths, setEditPaths] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [domains, setDomains] = useState<{_id: string, zoneName: string}[]>([]);
  const [scripts, setScripts] = useState<{_id: string, scriptName: string}[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedScript, setSelectedScript] = useState('');
  const [routePattern, setRoutePattern] = useState('');
  const [editRoutePattern, setEditRoutePattern] = useState('');
  const [editScriptName, setEditScriptName] = useState('');

  useEffect(() => {
    fetchRoutes();
    fetchDomains();
    fetchScripts();
  }, []);

  const fetchRoutes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/routes');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data);
      }
    } catch (error) {
      toast.error('Failed to load routes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/domains');
      if (res.ok) setDomains(await res.json());
    } catch {}
  };
  const fetchScripts = async () => {
    try {
      const res = await fetch('/api/scripts');
      if (res.ok) setScripts(await res.json());
    } catch {}
  };

  const handleDeleteRoute = async (routeId: string) => {
    setDeletingId(routeId);
    try {
      const response = await fetch(`/api/routes/${routeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Route deleted successfully');
        fetchRoutes();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete route');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const openEditModal = (route: RouteData) => {
    setEditingRoute(route);
    setEditRoutePattern(route.routePattern);
    setEditScriptName(route.scriptName);
  };
  const closeEditModal = () => {
    setEditingRoute(null);
    setEditRoutePattern('');
    setEditScriptName('');
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
    if (!editingRoute) return;
    setIsEditing(true);
    try {
      const response = await fetch(`/api/routes/${editingRoute._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routePattern: editRoutePattern, scriptName: editScriptName }),
      });
      if (response.ok) {
        toast.success('Route updated successfully!');
        closeEditModal();
        fetchRoutes();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update route');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsEditing(false);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId: selectedDomain, scriptName: selectedScript, routePattern }),
      });
      if (res.ok) {
        toast.success('Route created successfully!');
        setShowAddModal(false);
        setSelectedDomain('');
        setSelectedScript('');
        setRoutePattern('');
        fetchRoutes();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create route');
      }
    } finally {
      setIsAdding(false);
    }
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
          <h1 className="text-3xl font-bold">Manage Routes</h1>
          <p className="text-muted-foreground mt-2">Manage deployed Cloudflare Worker routes</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddModal(true)}>
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Route</DialogTitle>
              <DialogDescription>Connect script worker to domain and pattern.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddRoute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Domain</label>
                <Select value={selectedDomain} onValueChange={setSelectedDomain} required>
                  <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
                  <SelectContent>
                    {domains.map(d => <SelectItem key={d._id} value={d._id}>{d.zoneName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Script</label>
                <Select value={selectedScript} onValueChange={setSelectedScript} required>
                  <SelectTrigger><SelectValue placeholder="Select script" /></SelectTrigger>
                  <SelectContent>
                    {scripts.map(s => <SelectItem key={s.scriptName} value={s.scriptName}>{s.scriptName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Route Pattern</label>
                <GlowInput value={routePattern} onChange={e => setRoutePattern(e.target.value)} placeholder="example.com/*" required />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)} disabled={isAdding}>Cancel</Button>
                <Button className="bg-orange-500 hover:bg-orange-600" type="submit" disabled={isAdding}>{isAdding ? 'Saving...' : 'Save Route'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {routes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Route className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No routes yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                No routes are registered yet. Add a new route by connecting a script to a domain and pattern.
              </p>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddModal(true)}>
                Add Route
              </Button>
            </CardContent>
          </Card>
        ) : (
          routes.map((route, index) => (
            <motion.div
              key={route._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                        <Route className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{route.zoneName}</CardTitle>
                        <CardDescription className="font-mono text-sm">{route.routePattern}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(route.status)}>
                        {getStatusIcon(route.status)}
                        <span className="ml-1 capitalize">{route.status}</span>
                      </Badge>
                      <Dialog open={editingRoute?._id === route._id} onOpenChange={(open) => !open && closeEditModal()}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-blue-500 hover:text-blue-700" onClick={() => openEditModal(route)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Route</DialogTitle>
                            <DialogDescription>
                              Change script worker or route pattern.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Script</label>
                              <Select value={editScriptName} onValueChange={setEditScriptName} required>
                                <SelectTrigger><SelectValue placeholder="Select script" /></SelectTrigger>
                                <SelectContent>
                                  {scripts.map(s => <SelectItem key={s.scriptName} value={s.scriptName}>{s.scriptName}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Route Pattern</label>
                              <GlowInput value={editRoutePattern} onChange={e => setEditRoutePattern(e.target.value)} placeholder="example.com/*" required />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" type="button" onClick={closeEditModal} disabled={isEditing}>Cancel</Button>
                              <Button className="bg-orange-500 hover:bg-orange-600" type="submit" disabled={isEditing}>{isEditing ? 'Saving...' : 'Save Changes'}</Button>
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
                            <AlertDialogTitle>Delete Route</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this route? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRoute(route._id)}
                              className="bg-red-500 hover:bg-red-600"
                              disabled={deletingId === route._id}
                            >
                              {deletingId === route._id ? 'Deleting...' : 'Delete'}
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
                      <h4 className="font-medium text-sm mb-2">Script Name</h4>
                      <p className="text-sm text-muted-foreground font-mono">{route.scriptName}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {route.script && Array.isArray(route.script.keywords) && route.script.keywords.map((keyword: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Whitelist Paths</h4>
                      <div className="flex flex-wrap gap-1">
                        {route.script && Array.isArray(route.script.whitelistPaths) && route.script.whitelistPaths.length > 0
                          ? route.script.whitelistPaths.map((path: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {path}
                              </Badge>
                            ))
                          : <span className="text-xs text-muted-foreground">None</span>
                        }
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Deployed: {formatDistanceToNow(new Date(route.deployedAt), { addSuffix: true })}
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