'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Eye, CheckCircle, Clock } from 'lucide-react';
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
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      toast.error('Gagal memuat alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: string, status: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        toast.success('Status alert berhasil diupdate');
        fetchAlerts();
      } else {
        toast.error('Gagal update status alert');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'read':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertTriangle className="h-4 w-4" />;
      case 'read':
        return <Eye className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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
        {alerts.length > 0 && (
          <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
            <DialogTrigger asChild>
              <Button variant="destructive" onClick={() => setShowClearModal(true)}>
                Clear All Alerts
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
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{alert.scriptName}</CardTitle>
                        <CardDescription className="font-mono text-sm">{alert.fullPath}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Source IP</h4>
                      <p className="text-sm text-muted-foreground font-mono">{alert.sourceIP}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Response Code</h4>
                      <Badge variant="outline" className="text-xs">
                        {alert.responseCode}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Detected Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {alert.detectedKeywords.map((keyword, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Detected: {formatDistanceToNow(new Date(alert.time), { addSuffix: true })}
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