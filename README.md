# LinguaLink 🌐

LinguaLink is a production-ready, real-time chat application that enables seamless communication across language barriers. Users can chat in their native language while all participants instantly see messages translated into their preferred language, creating a truly global communication platform.

## 🌟 Key Value Proposition

- **Universal Communication**: Chat in 100+ languages simultaneously
- **Real-Time Translation**: Sub-100ms translation latency
- **Enterprise-Ready**: Built to support 10,000+ concurrent users
- **Intelligent Translation**: Context-aware AI with custom glossary support

## 🚀 Features

### Currently Implemented

- ✅ **Real-time messaging** with Supabase Realtime
- ✅ **User authentication** (email/password)
- ✅ **User profiles** with language preferences and status
- ✅ **Online presence** system with typing indicators
- ✅ **Message features**: Edit, delete, reply, reactions
- ✅ **Read receipts** and delivery status
- ✅ **Search functionality** for messages, chats, and users
- ✅ **Notification system** with in-app notifications
- ✅ **Command palette** (Cmd/Ctrl + K)
- ✅ **Dark mode** support
- ✅ **Responsive design** for all devices

### Coming Soon

- 🚧 AI-powered real-time translation
- 🚧 Media support (images, files, link previews)
- 🚧 OAuth providers (Google, GitHub)
- 🚧 Browser push notifications
- 🚧 Email notifications
- 🚧 Custom glossary management
- 🚧 Admin dashboard
- 🚧 Moderation tools

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with TypeScript and App Router
- **Styling**: Tailwind CSS v4 (CSS-based configuration)
- **Database**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **AI Translation**: Groq Cloud API, Cloudflare Workers AI, LibreTranslate (planned)
- **Edge Functions**: Vercel Edge Functions
- **Caching**: Upstash Redis (planned)
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18.0 or higher
- npm, yarn, or pnpm
- Supabase account
- Git

## 🏁 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/herrgallardo/lingualink.git
cd lingualink
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Test Users (for development)
TEXT_USER_MAIL=testuser@test.com
TEXT_USER_PASSWORD=TestUser101338
TEXT_USER_USERNAME=testuser
TEXT_USER2_MAIL=testuser2@test.com
TEXT_USER2_PASSWORD=TestUser101338
TEXT_USER2_USERNAME=testuser2

# Translation APIs (Coming Soon)
# GROQ_API_KEY=your-groq-api-key
# CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
# CLOUDFLARE_API_TOKEN=your-cloudflare-api-token

# Redis Cache (Coming Soon)
# UPSTASH_REDIS_REST_URL=your-upstash-url
# UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

### 4. Set up the database

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each migration file in order from `supabase/migrations/`:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_storage_setup.sql`
   - `004_realtime_setup.sql`
   - `005_performance_optimization.sql`

See `supabase/README.md` for detailed migration instructions.

### 5. Enable Realtime

In your Supabase dashboard:

1. Go to Database → Replication
2. Enable replication for these tables:
   - `users`
   - `messages`
   - `message_reactions`
   - `read_receipts`

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```plaintext
lingualink/
├── app/                    # Next.js App Router
│   ├── (app)/             # Authenticated routes
│   │   ├── chat/          # Chat conversations
│   │   ├── profile/       # User profile
│   │   ├── search/        # Search functionality
│   │   └── users/         # User directory
│   └── auth/              # Authentication pages
├── components/            # React components
│   ├── auth/             # Auth forms and buttons
│   ├── chat/             # Chat UI components
│   ├── debug/            # Debug panels
│   ├── layout/           # Layout components
│   ├── notifications/    # Notification system
│   ├── presence/         # Online status
│   ├── profile/          # Profile management
│   ├── search/           # Search components
│   └── ui/               # Base UI components
├── lib/                   # Core functionality
│   ├── context/          # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── i18n/             # Internationalization
│   ├── services/         # Service layer
│   ├── supabase/         # Supabase clients
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── public/               # Static assets
├── scripts/              # Development scripts
└── supabase/            # Database migrations
```

## 🛠️ Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format with Prettier
npm run format:check    # Check formatting
npm run type-check      # TypeScript checking

# Database
npm run db:verify       # Verify database setup
npm run db:types        # Generate TypeScript types
npm run db:reset        # Reset database (caution!)

# Testing & Debugging
npm run debug           # Comprehensive realtime debug
npm run troubleshoot    # Troubleshoot realtime
npm run test:realtime   # Test realtime features
npm run chat:test       # Test chat functionality
npm run presence:verify # Verify presence system
npm run preferences:check # Check preferences

# Utilities
npm run fix-rls         # Fix RLS policies
```

## 📊 Development Progress

### ✅ Phase 1: Project Foundation (Steps 1-5) - COMPLETE

- [x] Next.js 15 with TypeScript setup
- [x] Tailwind CSS v4 configuration
- [x] Supabase project setup
- [x] Database schema design
- [x] Authentication system

### 🚧 Phase 2: User Experience (Steps 6-10) - COMPLETE

- [x] User profile management
- [x] Real-time presence
- [x] Application layout
- [x] Search features
- [x] Notification system

### 🚧 Phase 3: Chat Functionality (Steps 11-15) - IN PROGRESS

- [x] Chat UI components
- [x] Real-time messaging
- [x] Message features (edit, delete, reply)
- [ ] Media support
- [ ] Performance optimization

### 📋 Phase 4: AI Translation System (Steps 16-20) - PLANNED

- [ ] Translation architecture
- [ ] Hybrid translation pipeline
- [ ] Context-aware translation
- [ ] Translation optimization
- [ ] Glossary management

### 📋 Phase 5: Administration (Steps 21-25) - PLANNED

- [ ] Admin dashboard
- [ ] Analytics integration
- [ ] Moderation tools
- [ ] Data management
- [ ] Testing suite

### 📋 Phase 6: Production Deployment (Steps 26-30) - PLANNED

- [ ] Security hardening
- [ ] Performance tuning
- [ ] SEO & metadata
- [ ] Monitoring setup
- [ ] CI/CD pipeline

## 🎯 Success Criteria

- **Performance**: < 3s initial load, < 100ms message latency
- **Reliability**: 99.9% uptime
- **Scalability**: Support 10,000+ concurrent users
- **Quality**: Lighthouse score 90+
- **Testing**: 70%+ code coverage
- **Accessibility**: WCAG 2.1 AA compliant

## 🐛 Debugging & Troubleshooting

### Debug Realtime Issues

```bash
npm run debug
```

This comprehensive script tests:

- Environment configuration
- Authentication flow
- Database access and RLS
- Realtime subscriptions
- Message flow
- Edge cases

### Common Issues

1. **Realtime not working**

   - Ensure Realtime is enabled for tables in Supabase
   - Check RLS policies
   - Run `npm run troubleshoot`

2. **Authentication errors**

   - Verify environment variables
   - Check Supabase Auth settings
   - Ensure user profiles are created

3. **Database errors**
   - Run `npm run db:verify`
   - Check migration status
   - Verify RLS policies with `npm run fix-rls`

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Manual deployment
vercel --prod
```

### Environment Variables for Production

- All `NEXT_PUBLIC_*` variables
- `SUPABASE_SERVICE_ROLE_KEY`
- Translation API keys (when implemented)
- Redis credentials (when implemented)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Ensure all checks pass

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Heroicons](https://heroicons.com/) - Icon library
- [Vercel](https://vercel.com/) - Deployment platform

---

Built with ❤️ by the LinguaLink team
