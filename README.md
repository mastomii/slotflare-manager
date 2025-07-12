# 🌩️ Cloudflare Worker Manager

A comprehensive web application for managing Cloudflare Workers with an intuitive UI. Built with Next.js, MongoDB, and integrated with Cloudflare's API.

## ✨ Features

- **🔐 User Authentication** - Secure login/register with NextAuth.js
- **🌍 Domain Management** - Validate and manage Cloudflare domains
- **⚙️ Worker Deployment** - Generate and deploy Workers automatically
- **🛣️ Route Management** - Configure and manage Worker routes
- **📊 Deploy History** - Track all deployments with detailed logs
- **🎨 Modern UI** - GitHub-inspired design with dark/light mode
- **📱 Responsive** - Works perfectly on all devices

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cloudflare-worker-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   MONGODB_URI=your-mongodb-connection-string
   MONGODB_DBNAME=CloudflareWorkerManager
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ENABLE_REGISTRATION=true
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to http://localhost:3000
   - You'll be redirected to the login page

## 📖 Documentation

For detailed setup instructions, deployment guides, and troubleshooting, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🛠️ Tech Stack

- **Frontend**: Next.js 13 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Animations**: Framer Motion
- **Theming**: next-themes
- **API Integration**: Cloudflare REST API

## 🎯 How It Works

1. **Register/Login** - Create an account or sign in
2. **Configure Cloudflare** - Add your API token and Account ID
3. **Add Domains** - Validate domains from your Cloudflare account
4. **Deploy Workers** - Set keywords and deploy filtering Workers
5. **Manage Routes** - Configure route patterns for your domains
6. **Monitor** - Track deployment history and logs

## 🔧 Configuration

### Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DBNAME`: Database name (default: CloudflareWorkerManager)
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js
- `NEXTAUTH_URL`: Your application URL
- `ENABLE_REGISTRATION`: Set to `false` to disable new user registration (default: `true`)

### Cloudflare API Setup

1. Get your API Token from [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Required permissions:
   - Zone:Zone:Read
   - Zone:Zone Settings:Edit
   - Account:Cloudflare Workers:Edit
   - Zone:Worker Routes:Edit

3. Get your Account ID from the Cloudflare Dashboard sidebar

### Database Setup

The application supports both MongoDB Atlas (cloud) and local MongoDB installations. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup instructions.

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── login/            # Authentication pages
│   └── register/
├── components/            # Reusable UI components
├── lib/                  # Utility libraries
├── models/               # MongoDB models
├── utils/                # Helper functions
└── types/                # TypeScript definitions
```

## 🌟 Key Features Explained

### Automated Worker Generation
The application automatically generates Cloudflare Worker scripts based on your keywords and whitelist paths:

```javascript
// Example generated script
export default {
  async fetch(request, env, ctx) {
    const keywords = ["spam", "malware"];
    const whitelistPaths = ["/api/health"];
    
    // Filter logic here...
  }
};
```

### Domain Validation
Automatically validates domains against your Cloudflare account to ensure they exist and are active.

### Route Management
Configure route patterns to determine which requests are processed by your Workers.

## 🔒 Security

- Passwords are hashed using bcrypt
- API tokens are stored securely
- Session management with NextAuth.js
- Input validation and sanitization
- Protected API routes

## 🚀 Deployment

The application can be deployed to various platforms:

- **Vercel** (Recommended)
- **Netlify**
- **Docker**
- **Traditional hosting**

See [DEPLOYMENT.md](./DEPLOYMENT.md) for platform-specific instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for troubleshooting
2. Review the application logs
3. Verify your environment configuration
4. Create an issue with detailed information

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Animations with [Framer Motion](https://www.framer.com/motion/)