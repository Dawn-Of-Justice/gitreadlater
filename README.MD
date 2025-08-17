# 🚀 GitReadLater - Smart Repository Manager

> A full-stack web application that transforms how developers save, organize, and discover GitHub repositories. Built with a focus on robust backend architecture and seamless user experience.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-orange.svg)](https://supabase.com/)

## 🎯 Project Overview

GitReadLater is more than just a bookmark manager - it's a comprehensive repository discovery platform that demonstrates advanced full-stack development skills. The application features a robust backend API, secure authentication, and efficient data management.

## 🎥 Demo Video

Watch GitReadLater in action - see how easy it is to save, organize, and rediscover GitHub repositories:

<div align="center">
  <a href="https://youtu.be/_6nZszL1P0w" target="_blank">
    <img src="https://img.youtube.com/vi/_6nZszL1P0w/maxresdefault.jpg" alt="GitReadLater Demo Video" width="800" height="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
  </a>
</div>

*🎬 [Click here to watch the full demo on YouTube](https://youtu.be/_6nZszL1P0w) - See GitReadLater's features and capabilities in action!*

## ✨ Key Features

### 🔧 Backend Architecture
- **Express.js REST API** with modular service architecture
- **JWT Authentication & Authorization** middleware
- **Rate Limiting** and security middleware implementation
- **User-scoped database operations** with Row Level Security (RLS)
- **GitHub API Integration** with OAuth token management
- **Database Schema Design** with normalized relationships

### 🎨 Frontend Capabilities
- **React SPA** with Vite build optimization
- **Responsive UI** with Tailwind CSS
- **GitHub OAuth Integration** for seamless authentication
- **Real-time data synchronization** with Supabase
- **Advanced filtering and search** functionality

### 🛡️ Security Implementation
- **Environment variable management** with validation scripts
- **CORS configuration** for secure cross-origin requests
- **Input validation and sanitization**
- **Secure token handling** for GitHub API access

## 🏗️ Technical Architecture

### Backend Services (`src/services/`)
```
📦 services/
├── 🔐 userService.js       # User management & preferences
├── 📚 repositoryService.js # Repository CRUD operations
├── 🐙 githubService.js     # GitHub API integration
└── 📊 loggingService.cjs   # Application logging
```

### API Endpoints (`src/server/index.js`)
```javascript
// Authentication & User Management
GET    /api/user/profile          # User profile data
PUT    /api/user/settings         # Update user preferences

// Repository Management
GET    /api/repositories          # Fetch user repositories
POST   /api/repositories          # Save new repository
PUT    /api/repositories/:id      # Update repository
DELETE /api/repositories/:id      # Remove repository

// GitHub Integration
GET    /api/github/repos/:owner/:repo/readme  # Fetch README content
GET    /api/github/user/starred              # Import starred repos
POST   /api/github/repos/bulk-save           # Batch repository save
```

### Database Schema (`supabase/`)
```sql
-- Core Tables
📋 saved_repositories     # Repository storage with metadata
👤 user_profiles         # Extended user information
🏷️  repository_tags       # Tagging system
📈 user_analytics        # Usage tracking
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- GitHub account for OAuth
- Supabase account (free tier)

### Installation & Setup

1. **Clone and Install**
```bash
git clone https://github.com/Dawn-Of-Justice/gitreadlater.git
cd gitreadlater
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Configure your environment variables with new Supabase API keys
```

**Environment Variables Setup:**
```env
# Supabase Configuration (New API Keys Format)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_[your_key_here]

# Backend Service Role Key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_[your_secret_key_here]

# GitHub OAuth
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_REDIRECT_URL=http://localhost:5173/auth/callback
```

> **⚠️ Important:** Use the new Supabase API key format:
> - **Publishable Key**: Starts with `sb_publishable_` (safe for frontend)
> - **Secret Key**: Starts with `sb_secret_` (backend only, never expose)

3. **Database Setup**
```sql
-- Run SQL files in Supabase SQL Editor
supabase/saved-repositories-schema.sql
supabase/user-subscriptions-schema.sql
supabase/health.sql
```

4. **GitHub OAuth Configuration**
```
Application: GitReadLater
Homepage URL: http://localhost:5173
Callback URL: https://[project].supabase.co/auth/v1/callback
```

5. **Start Development Server**
```bash
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

## 🏗️ Development Highlights

### Backend Development Skills Demonstrated

#### 🔧 **Modular Service Architecture**
```javascript
// Clean separation of concerns
class RepositoryService {
  async saveRepository(repoData, userId) {
    // Business logic implementation
  }
  
  async getUserRepositories(userId, filters) {
    // Complex query handling
  }
}
```

#### 🛡️ **Security Middleware Implementation**
```javascript
// Custom authentication middleware
const authenticateUser = async (req, res, next) => {
  const token = extractBearerToken(req);
  const user = await validateJWT(token);
  req.user = user;
  next();
};
```

#### 📊 **Database Query Optimization**
```javascript
// Efficient data fetching with joins
const { data } = await supabase
  .from('saved_repositories')
  .select(`
    *,
    repository_tags(tag_name),
    user_profiles(display_name)
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

#### 🔄 **API Rate Limiting**
```javascript
// Custom rate limiting implementation
const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip;
  if (exceededRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
};
```

### Frontend Development Skills

#### ⚡ **State Management**
- Context API for global state
- Custom hooks for data fetching
- Optimistic updates for better UX

#### 🎨 **UI/UX Design**
- Responsive design with Tailwind CSS
- Component-based architecture
- Loading states and error handling

## 📁 Project Structure

```
gitreadlater/
├── 🎯 src/
│   ├── 🖥️  server/           # Express.js backend
│   │   ├── index.js         # Main server file
│   │   └── package.json     # Server dependencies
│   ├── 🧩 components/       # React components
│   ├── 📄 pages/           # Route components
│   ├── 🔧 services/        # Business logic layer
│   ├── 🔗 lib/             # Utility functions
│   └── 🎨 styles/          # CSS modules
├── 🗄️  supabase/           # Database schemas
├── 🔒 scripts/            # Security validation
└── 📝 docs/              # Documentation
```

## 🚀 Deployment

### Production-Ready Features
- Environment variable validation
- Security checks before build
- CORS configuration for production
- Error handling and logging
- Health check endpoints

### Deployment Steps
```bash
# Security validation
npm run security-check

# Build optimization
npm run build

# Deploy to Vercel/Netlify
npm run deploy
```

## 🔧 Technical Decisions & Learnings

### Backend Architecture Choices
- **Express.js**: Lightweight and flexible for REST API development
- **Supabase**: PostgreSQL with built-in auth and real-time capabilities
- **Service Layer Pattern**: Clean separation between routes and business logic
- **Middleware Chain**: Custom authentication, rate limiting, and error handling

### Database Design
- **Row Level Security (RLS)**: User data isolation at the database level
- **Normalized Schema**: Efficient storage and query performance
- **Indexing Strategy**: Optimized queries for common access patterns

### Security Implementation
- **JWT Validation**: Secure token-based authentication
- **Environment Variables**: Secure configuration management
- **Input Sanitization**: Protection against injection attacks
- **Rate Limiting**: DOS protection and resource management

### For Full-Stack Skills
1. **End-to-End Ownership**: From database design to frontend deployment
2. **Real-World Problem Solving**: Actual use case with practical solutions
3. **Code Quality**: Clean architecture, documentation, and testing considerations
4. **DevOps Awareness**: Security scripts, environment management, and deployment

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GitHub API** for comprehensive repository data
- **Supabase** for backend infrastructure and authentication
- **React Ecosystem** for powerful frontend capabilities
- **Open Source Community** for inspiration and learning resources
