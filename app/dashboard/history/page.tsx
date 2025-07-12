'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import * as Papa from 'papaparse';
import toast from 'react-hot-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface HistoryData {
  _id: string;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  snapshot?: any;
  status?: string;
  errorMessage?: string;
  deployedAt?: string;
  createdAt?: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCsv = () => {
    const csvData = history.map(item => ({
      'Zone Name': item.snapshot?.zoneName || item.snapshot?.domain?.zoneName || '(No Domain Name)',
      'Route Pattern': item.snapshot?.routePattern || '',
      'Script Name': item.snapshot?.scriptName || item.snapshot?.script?.scriptName || '-',
      'Keywords': Array.isArray((item.snapshot?.keywords || item.snapshot?.script?.keywords)) ? (item.snapshot?.keywords || item.snapshot?.script?.keywords).join(', ') : '',
      'Whitelist Paths': Array.isArray((item.snapshot?.whitelistPaths || item.snapshot?.script?.whitelistPaths)) ? (item.snapshot?.whitelistPaths || item.snapshot?.script?.whitelistPaths).join(', ') : '',
      'Deploy Date': item.deployedAt ? new Date(item.deployedAt).toLocaleString('id-ID') : '-',
      'Status': item.status,
      'Error Message': item.errorMessage || '',
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudflare-worker-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('History exported successfully');
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/history', { method: 'DELETE' });
      if (response.ok) {
        toast.success('History deleted successfully!');
        setShowClearModal(false);
        fetchHistory();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete history');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsClearing(false);
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

  // Tambahkan fungsi untuk badge warna aksi
  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'delete':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity History</h1>
          <p className="text-muted-foreground mt-2">
            All important activities (add, edit, delete) for domains, scripts, and routes are recorded here.
          </p>
        </div>
        {history.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={exportToCsv}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
              <DialogTrigger asChild>
                <Button variant="destructive" onClick={() => setShowClearModal(true)}>
                  Clear History
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete All History?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete all deploy history? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowClearModal(false)} disabled={isClearing}>Cancel</Button>
                  <Button className="bg-red-500 hover:bg-red-600" onClick={handleClearHistory} disabled={isClearing}>
                    {isClearing ? 'Deleting...' : 'Delete All'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {history.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Activity history will appear after you add, edit, or delete a domain, script, or route.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Entity</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Detail</th>
                  <th className="px-4 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={item._id} className="border-b">
                    <td className="px-4 py-2 whitespace-nowrap">{item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Badge className={getActionBadgeColor(item.actionType || '')}>
                        <span className="capitalize">{item.actionType}</span>
                      </Badge>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap capitalize">{item.entityType}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Badge className={getStatusColor(item.status || '')}>
                        {getStatusIcon(item.status || '')}
                        <span className="ml-1 capitalize">{item.status || ''}</span>
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      {/* Detail snapshot tergantung entityType */}
                      {item.entityType === 'domain' && item.snapshot?.zoneName && (
                        <div>
                          <div className="font-semibold">Domain:</div>
                          <div className="font-mono text-xs">{item.snapshot.zoneName}</div>
                        </div>
                      )}
                      {item.entityType === 'script' && item.snapshot?.scriptName && (
                        <div>
                          <div className="font-semibold">Script:</div>
                          <div className="font-mono text-xs">{item.snapshot.scriptName}</div>
                          <div className="text-xs mt-1">Keywords: {Array.isArray(item.snapshot.keywords) ? item.snapshot.keywords.join(', ') : '-'}</div>
                          <div className="text-xs">Whitelist: {Array.isArray(item.snapshot.whitelistPaths) ? item.snapshot.whitelistPaths.join(', ') : '-'}</div>
                        </div>
                      )}
                      {item.entityType === 'route' && item.snapshot?.routePattern && (
                        <div>
                          <div className="font-semibold">Route:</div>
                          <div className="font-mono text-xs">{item.snapshot.routePattern}</div>
                          <div className="text-xs mt-1">Domain: {item.snapshot?.domain?.zoneName || '-'}</div>
                          <div className="text-xs">Script: {item.snapshot?.script?.scriptName || '-'}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-red-500">
                      {item.errorMessage || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}