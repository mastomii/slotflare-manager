'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { GlowInput } from '@/components/GlowInput';
import { Settings, Globe, Rocket, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { data: session, update } = useSession();
  const [apiToken, setApiToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    domains: 0,
    workers: 0,
    routes: 0,
  });
  const [isConfigured, setIsConfigured] = useState(false);
  // Tambahkan state untuk menandai apakah sudah pernah diisi
  const [hasApiToken, setHasApiToken] = useState(false);
  const [hasAccountId, setHasAccountId] = useState(false);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/trigger` : '/api/trigger';

  useEffect(() => {
    if (session?.user) {
      setApiToken(session.user.cloudflareApiToken || '');
      setAccountId(session.user.accountId || '');
    }
  }, [session]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [domainsRes, routesRes, scriptsRes] = await Promise.all([
          fetch('/api/domains'),
          fetch('/api/routes'),
          fetch('/api/scripts'),
        ]);

        const domains = await domainsRes.json();
        const routes = await routesRes.json();
        const scripts = await scriptsRes.json();

        setStats({
          domains: domains.length || 0,
          workers: scripts.length || 0, // Count deployed scripts as active workers
          routes: routes.length || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    // Cek status konfigurasi dari API, bukan dari session
    const checkConfig = async () => {
      try {
        const res = await fetch('/api/cloudflare/status');
        const data = await res.json();
        setIsConfigured(data.configured === true);
        setHasApiToken(data.hasApiToken === true);
        setHasAccountId(data.hasAccountId === true);
      } catch (error) {
        console.error('❌ Error checking configuration:', error);
        setIsConfigured(false);
        setHasApiToken(false);
        setHasAccountId(false);
      }
    };
    checkConfig();
  }, []);

  // Load initial value from backend
  useEffect(() => {
    fetch('/api/trigger/config')
      .then(res => res.json())
      .then(data => setWebhookEnabled(!!data.enabled));
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/cloudflare/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiToken, accountId }),
      });

      if (response.ok) {
        toast.success('Configuration saved successfully!');
        // Refresh configuration status after saving
        const statusRes = await fetch('/api/cloudflare/status');
        const statusData = await statusRes.json();
        setIsConfigured(statusData.configured === true);
        setHasApiToken(statusData.hasApiToken === true);
        setHasAccountId(statusData.hasAccountId === true);
        await update();
      } else {
        const data = await response.json();
        console.error('❌ Save configuration failed:', data);
        toast.error(data.error || 'An error occurred');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebhookToggle = async (checked: boolean) => {
    setWebhookLoading(true);
    setWebhookEnabled(checked);
    await fetch('/api/trigger/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: checked }),
    });
    setWebhookLoading(false);
  };

  return (
    <div className="space-y-6 w-full">

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            Configuration Status
          </CardTitle>
          <CardDescription>
            {isConfigured
              ? 'Cloudflare account successfully configured'
              : 'Please configure your Cloudflare account first'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Domain</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.domains}</div>
              <p className="text-xs text-muted-foreground">
                Verified domains
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              <Rocket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.workers}</div>
              <p className="text-xs text-muted-foreground">
                Deployed worker scripts
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.routes}</div>
              <p className="text-xs text-muted-foreground">
                Configured routes
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Cloudflare Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Cloudflare Configuration</CardTitle>
          <CardDescription>
            Enter API Token and Account ID from your Cloudflare account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiToken">Cloudflare API Token</Label>
              <GlowInput
                id="apiToken"
                type="password"
                placeholder={hasApiToken ? 'Already filled' : 'Enter API Token'}
                value={hasApiToken && !apiToken ? '********************' : apiToken}
                onChange={(e) => {
                  setApiToken(e.target.value);
                }}
                required
              />
              <p className="text-sm text-muted-foreground">
                Get from{' '}
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline"
                >
                  Cloudflare Dashboard
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID</Label>
              <GlowInput
                id="accountId"
                type="password"
                placeholder={hasAccountId ? 'Already filled' : 'Enter Account ID'}
                value={hasAccountId && !accountId ? '********************' : accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                }}
                required
              />
              <p className="text-sm text-muted-foreground">
                Find in the right sidebar of your Cloudflare account overview page
              </p>
            </div>

            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Trigger Alert</CardTitle>
          <CardDescription>
            Enable to receive Trigger Alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-2">
            <label htmlFor="webhook-toggle" className="font-medium">Enable Trigger Alert</label>
            <input
              id="webhook-toggle"
              type="checkbox"
              checked={webhookEnabled}
              onChange={e => handleWebhookToggle(e.target.checked)}
              className="w-5 h-5 accent-orange-500"
              disabled={webhookLoading}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Make sure this application is accessible from the public internet if you want to use Trigger Alert.
          </p>
          {webhookEnabled && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 text-xs select-all">
              <span className="font-semibold">Trigger Alert URL:</span> {webhookUrl}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}