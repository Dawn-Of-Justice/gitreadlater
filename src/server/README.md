# ReadLater Backend

This is the backend API for ReadLater, an open-source GitHub repository manager.

## Features

- ✅ Repository CRUD operations
- ✅ Search functionality
- ✅ Supabase integration
- ✅ CORS enabled
- ✅ Health monitoring
- ✅ Error handling

## Environment Variables

Create a `.env` file in this directory with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
```

## API Endpoints

### Health Check
- `GET /` - Basic API info
- `GET /health` - Health status with uptime

### Repositories
- `GET /api/repositories` - List all repositories
- `GET /api/repositories/:id` - Get repository by ID
- `POST /api/repositories` - Create new repository
- `PUT /api/repositories/:id` - Update repository
- `DELETE /api/repositories/:id` - Delete repository
- `GET /api/repositories/search/:query` - Search repositories

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## Deployment

### Vercel Deployment

1. **Set up environment variables in Vercel:**
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Go to "Environment Variables" section
   - Add the following variables:
     - `VITE_SUPABASE_URL` = your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anonymous key

2. **Deploy:**
   ```bash
   # Deploy to Vercel
   vercel --prod
   ```

### Manual Environment Variable Setup

If you're setting up Vercel for the first time:

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy
vercel --prod
```

### Local Development

Create a `.env` file in this directory (copy from `.env.example`):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
```

## Contributing

This is an open-source project. Contributions are welcome!

## License

MIT License - see the LICENSE file for details.
