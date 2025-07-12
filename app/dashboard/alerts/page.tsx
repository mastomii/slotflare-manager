'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface AlertData {
  _id: string;
  scriptName: string;
  fullPath: string;
  time: string;
  sourceIP: string;
  responseCode: number;
  detectedKeywords: string[];
  status: string;
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const response = await fetch('/api/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
        if (isRefresh) {
          toast.success('Alerts refreshed');
        }
      }
    } catch (error) {
      toast.error('Gagal memuat alerts');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchAlerts(true);
  };



  const clearAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Alert berhasil dihapus');
        fetchAlerts();
      } else {
        toast.error('Gagal menghapus alert');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const clearAllAlerts = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/alerts', {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Semua alert berhasil dihapus');
        setShowClearModal(false);
        fetchAlerts();
      } else {
        toast.error('Gagal menghapus semua alert');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsClearing(false);
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
          <h1 className="text-3xl font-bold">Alert History</h1>
          <p className="text-muted-foreground mt-2">Alert history from worker scripts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          {alerts.length > 0 && (
            <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" onClick={() => setShowClearModal(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete All Alerts?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete all alert history? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowClearModal(false)} disabled={isClearing}>Cancel</Button>
                  <Button className="bg-red-500 hover:bg-red-600" onClick={clearAllAlerts} disabled={isClearing}>
                    {isClearing ? 'Deleting...' : 'Delete All'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                No alerts have been recorded yet. Alerts will appear when a script with alert enabled detects forbidden keywords.
              </p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert, index) => (
            <motion.div
              key={alert._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg mt-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{alert.scriptName}</h3>
                          <Badge variant="outline" className="text-xs">
                            {alert.responseCode}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate mb-2">
                          {alert.fullPath}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="font-mono">{alert.sourceIP}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(alert.time), { addSuffix: true })}</span>
                          {alert.detectedKeywords.length > 0 && (
                            <span className="flex flex-wrap gap-1 ml-2">
                              {alert.detectedKeywords.map((keyword, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearAlert(alert._id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        title="Delete alert"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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