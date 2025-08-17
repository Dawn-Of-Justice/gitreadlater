# ReadLater Security Configuration

## Environment Variables

### Production Environment Variables (Vercel)

**Frontend Project Settings:**
- Navigate to Vercel Dashboard → gitreadlater → Settings → Environment Variables
- Add these variables for Production, Preview, and Development:

```
VITE_SUPABASE_URL=https://vrnyxxaggkvnrjjlonft.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybnl4eGFnZ2t2bnJqamxvbmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxODAwOTUsImV4cCI6MjA2MDc1NjA5NX0.mtH4hUAIO2lKca9UcZx7GAHXK69ppcfredDOo0Lw1sY
VITE_GITHUB_CLIENT_ID=Ov23li5BX177939M2qpy
VITE_REDIRECT_URL=https://gitreadlater.vercel.app/auth/callback
VITE_API_URL=https://gitreadlater-backend.vercel.app
```

**Backend Project Settings:**
- Navigate to Vercel Dashboard → gitreadlater-backend → Settings → Environment Variables
- Add these variables for Production, Preview, and Development:

```
VITE_SUPABASE_URL=https://vrnyxxaggkvnrjjlonft.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybnl4eGFnZ2t2bnJqamxvbmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxODAwOTUsImV4cCI6MjA2MDc1NjA5NX0.mtH4hUAIO2lKca9UcZx7GAHXK69ppcfredDOo0Lw1sY
```

## Security Checklist

### ✅ Completed
- [x] Environment variables properly configured
- [x] CORS restricted to specific domains  
- [x] Rate limiting implemented
- [x] Input validation added
- [x] .env file gitignored
- [x] Separate frontend/backend deployments

### 🔄 In Progress  
- [ ] Authentication middleware for protected routes
- [ ] User authorization checks
- [ ] Request sanitization
- [ ] Security headers
- [ ] Input size limits

### 📋 Recommended Next Steps
1. Add authentication middleware to API routes
2. Implement proper user authorization
3. Add request sanitization
4. Set up monitoring and logging
5. Regular security audits

## Database Security (Supabase)

### Row Level Security (RLS)
Ensure RLS is enabled on all tables with proper policies:

```sql
-- Enable RLS on repositories table
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own repositories
CREATE POLICY "Users can view their own repositories" ON repositories
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own repositories  
CREATE POLICY "Users can insert their own repositories" ON repositories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own repositories
CREATE POLICY "Users can update their own repositories" ON repositories
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own repositories
CREATE POLICY "Users can delete their own repositories" ON repositories
  FOR DELETE USING (auth.uid() = user_id);
```

## HTTPS & Domain Security

### Automatic HTTPS
- ✅ Vercel provides automatic HTTPS
- ✅ HTTP requests automatically redirect to HTTPS
- ✅ SSL/TLS certificates auto-renewed

### Domain Configuration
- Frontend: https://gitreadlater.vercel.app
- Backend API: https://gitreadlater-backend.vercel.app
- Custom domain: Configure in Vercel settings if desired

## Monitoring & Alerts

### Vercel Analytics
- Enable Vercel Analytics for performance monitoring
- Set up error tracking and alerting
- Monitor API usage and rate limits

### Security Monitoring
- Regular dependency updates
- Automated security scanning
- Log monitoring for suspicious activity
