'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { GlowInput } from '@/components/GlowInput';
import { Badge } from '@/components/ui/badge';
import { Globe, Plus, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface Domain {
  _id: string;
  zoneName: string;
  zoneId: string;
  status: string;
  createdAt: string;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/domains');
      if (response.ok) {
        const data = await response.json();
        setDomains(data);
      }
    } catch (error) {
      toast.error('Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingDomain(true);

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domainName: newDomain }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Domain added successfully!');
        setNewDomain('');
        fetchDomains();
      } else {
        toast.error(data.error || 'Failed to add domain');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (domain: Domain) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/domains/${domain._id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Domain deleted successfully!');
        setDeletingDomain(null);
        fetchDomains();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete domain');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
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
      <div>
        <h1 className="text-3xl font-bold">Manage Domains</h1>
        <p className="text-muted-foreground mt-2">
          Manage domains connected to your Cloudflare account
        </p>
      </div>

      {/* Add Domain Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Domain
          </CardTitle>
          <CardDescription>
            Enter a domain name that already exists in your Cloudflare account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="domain" className="sr-only">
                Domain Name
              </Label>
              <GlowInput
                id="domain"
                type="text"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600"
              disabled={isAddingDomain}
            >
              {isAddingDomain ? 'Adding...' : 'Add Domain'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Domains List */}
      <div className="grid gap-4">
        {domains.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No domains yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add domains that already exist in your Cloudflare account
              </p>
            </CardContent>
          </Card>
        ) : (
          domains.map((domain, index) => (
            <motion.div
              key={domain._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                        <Globe className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{domain.zoneName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Zone ID: {domain.zoneId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Added: {formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(domain.status)}>
                        {getStatusIcon(domain.status)}
                        <span className="ml-1 capitalize">{domain.status}</span>
                      </Badge>
                      <Dialog open={deletingDomain?._id === domain._id} onOpenChange={(open) => !open && setDeletingDomain(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-red-500 hover:text-red-700" onClick={() => setDeletingDomain(domain)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Domain</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete domain <b>{domain.zoneName}</b>? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeletingDomain(null)} disabled={isDeleting}>Cancel</Button>
                            <Button className="bg-red-500 hover:bg-red-600" onClick={() => handleDeleteDomain(domain)} disabled={isDeleting}>
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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