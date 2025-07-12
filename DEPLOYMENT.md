# 🚀 Deployment Guide - Cloudflare Worker Manager

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB Database** (Local or Cloud)
3. **Cloudflare Account** with API access

## 🗄️ Database Setup

### Option 1: MongoDB Atlas (Recommended for Production)

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account
   - Create a new cluster

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password

3. **Whitelist IP Addresses**
   - Go to Network Access
   - Add IP Address: `0.0.0.0/0` (for all IPs) or specific IPs

### Option 2: Local MongoDB

1. **Install MongoDB**
   ```bash
   # macOS
   brew install mongodb-community
   
   # Ubuntu
   sudo apt-get install mongodb
   
   # Windows
   # Download from https://www.mongodb.com/try/download/community
   ```

2. **Start MongoDB Service**
   ```bash
   # macOS/Linux
   sudo systemctl start mongod
   
   # Or using brew (macOS)
   brew services start mongodb-community
   ```

## ⚙️ Environment Configuration

Create `.env.local` file in the root directory:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
MONGODB_DBNAME=CloudflareWorkerManager

# NextAuth Configuration
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# For production, use your domain:
# NEXTAUTH_URL=https://yourdomain.com

# Registration Control
ENABLE_REGISTRATION=true
# Set to false to disable new user registration
```

### Generate NEXTAUTH_SECRET

```bash
# Generate a secure secret
openssl rand -base64 32
```

## 🔧 Installation & Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo>
   cd cloudflare-worker-manager
   npm install
   ```

2. **Setup Environment Variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Open http://localhost:3000
   - You'll be redirected to the login page

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Add Environment Variables**
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add all variables from `.env.local`

4. **Custom Domain (Optional)**
   - Go to Settings > Domains
   - Add your custom domain

### Option 2: Netlify

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Drag and drop the `out` folder to Netlify
   - Or connect your Git repository

3. **Environment Variables**
   - Go to Site Settings > Environment Variables
   - Add all variables from `.env.local`

### Option 3: Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Run**
   ```bash
   docker build -t cloudflare-worker-manager .
   docker run -p 3000:3000 --env-file .env.local cloudflare-worker-manager
   ```

## 🔐 Cloudflare API Setup

### Get API Token

1. **Login to Cloudflare Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)

2. **Create API Token**
   - Go to My Profile > API Tokens
   - Click "Create Token"
   - Use "Custom token" template

3. **Token Permissions**
   ```
   Zone:Zone:Read
   Zone:Zone Settings:Edit
   Account:Cloudflare Workers:Edit
   Zone:Worker Routes:Edit
   ```

4. **Account Resources**
   - Include: All accounts

5. **Zone Resources**
   - Include: All zones

### Get Account ID

1. **Go to Cloudflare Dashboard**
2. **Select any domain**
3. **Copy Account ID** from the right sidebar

## 📊 Database Collections

The application will automatically create these collections:

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  password: String, // bcrypt hashed
  cloudflareApiToken: String,
  accountId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Domains Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  zoneName: String,
  zoneId: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### DeployLogs Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  zoneId: String,
  zoneName: String,
  routePattern: String,
  keywords: [String],
  whitelistPaths: [String],
  scriptName: String,
  deployedAt: Date,
  status: String,
  errorMessage: String,
  routeId: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔍 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   ```
   Error: connect ECONNREFUSED
   ```
   - Check if MongoDB is running
   - Verify connection string in `.env.local`
   - Check network access in MongoDB Atlas

2. **NextAuth Session Error**
   ```
   Error: NEXTAUTH_SECRET is not set
   ```
   - Add `NEXTAUTH_SECRET` to `.env.local`
   - Generate using: `openssl rand -base64 32`

3. **Cloudflare API Error**
   ```
   Error: 403 Forbidden
   ```
   - Check API token permissions
   - Verify Account ID is correct
   - Ensure token has Worker and Zone permissions

4. **Build Error**
   ```
   Error: Module not found
   ```
   - Run `npm install` to install dependencies
   - Check if all required packages are installed

### Debug Mode

Enable debug logging by adding to `.env.local`:
```env
DEBUG=true
NEXTAUTH_DEBUG=true
```

## 📈 Performance Optimization

1. **Database Indexing**
   ```javascript
   // Add indexes for better performance
   db.users.createIndex({ email: 1 }, { unique: true })
   db.domains.createIndex({ userId: 1, zoneName: 1 })
   db.deploylogs.createIndex({ userId: 1, createdAt: -1 })
   ```

2. **Caching**
   - Enable Redis for session storage (optional)
   - Use CDN for static assets

3. **Monitoring**
   - Set up error tracking (Sentry)
   - Monitor database performance
   - Track API usage

## 🛡️ Security Considerations

1. **Environment Variables**
   - Never commit `.env.local` to version control
   - Use strong, unique secrets
   - Rotate API tokens regularly

2. **Database Security**
   - Use MongoDB Atlas with IP whitelisting
   - Enable authentication
   - Regular backups

3. **API Security**
   - Implement rate limiting
   - Validate all inputs
   - Use HTTPS in production

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Check MongoDB connection and Cloudflare API credentials
4. Review application logs for specific error messages

For additional help, please refer to the documentation or create an issue in the repository.