# Git ReadLater

Git ReadLater is a web application that allows developers to save, organize, and manage GitHub repositories for later reference. It's like Pocket or Instapaper, but specifically designed for GitHub repositories.

## Features

- Save GitHub repositories with personal notes and tags
- Import repositories directly from your GitHub stars
- Search and filter saved repositories
- View repository details including README content
- Organize repositories with custom tags
- Responsive design for desktop and mobile

### Premium Features (Subscription)

- Unlimited saved repositories (free tier limited to 100)
- Advanced search with multiple filters and sorting options
- Rich tagging system with nested tags
- Automatic categorization suggestions
- Export to third-party services (Notion, etc.)

## Tech Stack

- **Frontend**: React with Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Authentication**: GitHub OAuth
- **API Integration**: GitHub REST API via Octokit
- **Payments**: Paddle integration for subscription management

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account (free tier available)
- A GitHub OAuth application
- A Paddle account (for subscription features)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/your-username/github-readlater.git
cd github-readlater
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
VITE_Paddle_PRICE_ID=your_Paddle_price_id
VITE_API_URL=http://localhost:3000
```

4. Set up Supabase:
   - Create a new project in Supabase
   - Run the SQL commands from `supabase-schema.sql` and `subscription-schema.sql` in the SQL Editor
   - Set up GitHub OAuth in the Authentication settings

5. Set up Paddle (for subscription features):
   - Create a Paddle account and product with a monthly subscription price
   - Add your Paddle price ID to the `.env` file
   - Configure the webhook endpoint (see Server Setup below)

6. Start the development server:

```bash
npm run dev
```

7. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Server Setup (for Paddle integration)

1. Navigate to the server directory:

```bash
cd server
```

2. Install server dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example` in the server directory:

```
# Paddle API Keys
Paddle_SECRET_KEY=your_Paddle_secret_key
Paddle_WEBHOOK_SECRET=your_Paddle_webhook_secret

# Supabase API Keys
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server
PORT=3000
```

4. Start the server:

```bash
npm start
```

For detailed server setup instructions, see the [server README](./server/README.md).

## Supabase Setup

1. Create a new project in Supabase
2. Go to the SQL Editor and run the SQL commands from:
   - `supabase-schema.sql` (core tables)
   - `subscription-schema.sql` (subscription tables)
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

## Paddle Setup

1. Create a Paddle account at [Paddle.com](https://Paddle.com)
2. In the Paddle Dashboard, create a product and price:
   - Go to Products > Create Product
   - Set the product name (e.g., "Git ReadLater Premium")
   - Add a price (e.g., $3/month)
   - Copy the Price ID (starts with "price_") to your frontend `.env` file
3. Get your API keys from Developers > API keys
4. Set up webhook for subscription lifecycle events:
   - Go to Developers > Webhooks > Add endpoint
   - Set the endpoint URL to your server's webhook endpoint
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Get the Webhook Secret for your server's `.env` file

## Deployment

### Frontend (Vercel/Netlify)

1. Push your code to a GitHub repository
2. Import your repository in Vercel or Netlify
3. Set environment variables in your hosting platform
4. Deploy!

### Backend Server (for Paddle integration)

The backend server can be deployed to Vercel, Heroku, or any Node.js hosting platform.

For Vercel:
1. Add a `vercel.json` file to the server directory
2. Deploy with the Vercel CLI

For Heroku:
1. Create a new Heroku app
2. Set environment variables in the Heroku dashboard
3. Deploy using the Heroku CLI or GitHub integration

## Project Structure

```
github-readlater/
├── public/                # Static assets
├── server/                # Backend server for Paddle integration
├── src/
│   ├── components/        # Reusable React components
│   ├── lib/               # Utility functions and API clients
│   ├── pages/             # Page components
│   ├── services/          # Service modules for API interactions
│   ├── App.jsx            # Main application component
│   ├── index.css          # Global styles
│   └── main.jsx           # Entry point
├── .env.example           # Example environment variables
├── subscription-schema.sql # SQL for subscription tables
├── supabase-schema.sql    # SQL for core tables
└── README.md              # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- GitHub API for providing access to repository data
- Supabase for the excellent backend services
- React and Vite for the frontend framework
- Tailwind CSS for the styling
- Paddle for the subscription payment system
- patch