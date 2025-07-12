import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      cloudflareApiToken: string;
      accountId: string;
    };
  }

  interface User {
    id: string;
    email: string;
    cloudflareApiToken: string;
    accountId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    cloudflareApiToken: string;
    accountId: string;
  }
}