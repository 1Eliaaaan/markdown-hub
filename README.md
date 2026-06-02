# MarkdownHub 📝

A beautiful Markdown file manager for organizing your ideas, documentation, and notes. Built with Next.js, Supabase, and deployed on Vercel.

## Features

- 📂 **Project Management** — Create projects with folders, subfolders, and Markdown files
- 🌲 **Tree View** — Visual file structure with collapsible folders
- ✍️ **Rich Editor** — Comfortable Markdown editor with toolbar, live preview, and auto-save
- 🔗 **Share Links** — Share projects via link with configurable permissions (edit/view)
- 🚀 **Deploy on Vercel** — One-click deployment ready
- 🎨 **Premium Design** — Dark editorial theme with smooth animations

## Quick Start

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-migration.sql`
3. Copy your project URL and anon key from **Settings → API**

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push your code to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Tech Stack

- **Next.js 16** — React framework with App Router
- **TypeScript** — Type safety
- **Supabase** — PostgreSQL database
- **react-markdown** — Markdown rendering with GFM support
- **Lucide React** — Beautiful icons
- **Vercel** — Deployment platform

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── projects/        # Project CRUD
│   │   ├── items/           # File/folder CRUD  
│   │   └── share/           # Share link management
│   ├── p/[projectId]/       # Workspace page
│   ├── s/[token]/           # Shared view page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Design system
├── components/
│   ├── TreeView.tsx         # File tree component
│   ├── MarkdownEditor.tsx   # Editor + preview
│   ├── ShareDialog.tsx      # Share management modal
│   └── CreateItemDialog.tsx # Create file/folder modal
└── lib/
    └── supabase.ts          # Supabase client + types
```

## License

MIT
