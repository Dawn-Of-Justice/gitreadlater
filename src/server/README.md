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

This backend is designed to work with Vercel. The `vercel.json` configuration file handles the deployment settings.

## Contributing

This is an open-source project. Contributions are welcome!

## License

MIT License - see the LICENSE file for details.
