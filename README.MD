# Git ReadLater

Git ReadLater is a **free and open-source** web application that allows developers to save, organize, and manage GitHub repositories for later reference. It's like Pocket or Instapaper, but specifically designed for GitHub repositories.

## Features

- Save unlimited GitHub repositories with personal notes and tags
- Import repositories directly from your GitHub stars
- Search and filter saved repositories
- View repository details including README content
- Organize repositories with custom tags
- Responsive design for desktop and mobile
- Advanced search with multiple filters and sorting options
- Rich tagging system
- No limits, completely free to use

## Tech Stack

- **Frontend**: React with Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Authentication**: GitHub OAuth
- **API Integration**: GitHub REST API via Octokit

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account (free tier available)
- A GitHub OAuth application

### Setup

1. Clone the repository:

```bash
git clone https://github.com/Dawn-Of-Justice/gitreadlater.git
cd gitreadlater
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_REDIRECT_URL=http://localhost:5173/auth/callback
```

4. Set up Supabase:
   - Create a new project in Supabase
   - Run the SQL commands from the `supabase/` directory in the SQL Editor
   - Set up GitHub OAuth in the Authentication settings

5. Start the development server:

```bash
npm run dev
```

7. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Supabase Setup

1. Create a new project in Supabase
2. Go to the SQL Editor and run the SQL commands from the `supabase/` directory
3. Set up GitHub OAuth in Authentication > Providers:
   - Enable GitHub provider
   - Add your GitHub OAuth client ID and secret
   - Set callback URL to `http://localhost:5173/auth/callback` (for local development)

## GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps > New OAuth App
2. Fill in the details:
   - Application name: Git ReadLater (or your preferred name)
   - Homepage URL: http://localhost:5173 (for local development)
   - Authorization callback URL: https://[your-supabase-project].supabase.co/auth/v1/callback
3. Register the application
4. Copy the Client ID and Client Secret to your Supabase project

## Deployment

### Frontend (Vercel/Netlify)

1. Push your code to a GitHub repository
2. Import your repository in Vercel or Netlify
3. Set environment variables in your hosting platform
4. Deploy!

## Project Structure

```
gitreadlater/
├── public/                # Static assets
├── src/
│   ├── components/        # Reusable React components
│   ├── lib/               # Utility functions and API clients
│   ├── pages/             # Page components
│   ├── services/          # Service modules for API interactions
│   ├── App.jsx            # Main application component
│   ├── index.css          # Global styles
│   └── main.jsx           # Entry point
├── supabase/              # Database schema files
├── .env.example           # Example environment variables
└── README.md              # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- GitHub API for providing access to repository data
- Supabase for the excellent backend services
- React and Vite for the frontend framework
- Tailwind CSS for the styling