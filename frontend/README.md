# MiniKit Template

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-onchain --mini`](), configured with:

- [MiniKit](https://docs.base.org/builderkits/minikit/overview)
- [OnchainKit](https://www.base.org/builders/onchainkit)
- [Tailwind CSS](https://tailwindcss.com)
- [Next.js](https://nextjs.org/docs)

## Getting Started

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

2. Verify environment variables, these will be set up by the `npx create-onchain --mini` command:

You can regenerate the FARCASTER Account Association environment variables by running `npx create-onchain --manifest` in your project directory.

The environment variables enable the following features:

- Frame metadata - Sets up the Frame Embed that will be shown when you cast your frame
- Account association - Allows users to add your frame to their account, enables notifications
- Redis API keys - Enable Webhooks and background notifications for your application by storing users notification details

```bash
# Shared/OnchainKit variables
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=
NEXT_PUBLIC_URL=
NEXT_PUBLIC_ICON_URL=
NEXT_PUBLIC_ONCHAINKIT_API_KEY=

# Frame metadata
FARCASTER_HEADER=
FARCASTER_PAYLOAD=
FARCASTER_SIGNATURE=
NEXT_PUBLIC_APP_ICON=
NEXT_PUBLIC_APP_SUBTITLE=
NEXT_PUBLIC_APP_DESCRIPTION=
NEXT_PUBLIC_APP_SPLASH_IMAGE=
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=
NEXT_PUBLIC_APP_PRIMARY_CATEGORY=
NEXT_PUBLIC_APP_HERO_IMAGE=
NEXT_PUBLIC_APP_TAGLINE=
NEXT_PUBLIC_APP_OG_TITLE=
NEXT_PUBLIC_APP_OG_DESCRIPTION=
NEXT_PUBLIC_APP_OG_IMAGE=

# Redis config
REDIS_URL=
REDIS_TOKEN=
```

3. Start the development server:

```bash
npm run dev
```

## Template Features

### Frame Configuration

- `.well-known/farcaster.json` endpoint configured for Frame metadata and account association
- Frame metadata automatically added to page headers in `layout.tsx`

### WHOOP Webhook (Backend)

- WHOOP events are handled in the backend service under `backend/app/api/webhooks/whoop`

### WHOOP OAuth (Frontend)

- Add these environment variables to enable WHOOP connect flow:

```
WHOOP_API_HOSTNAME=https://api.prod.whoop.com
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=
WHOOP_OAUTH_SCOPE=offline read:profile read:sleep read:recovery
NEXT_PUBLIC_URL=https://your-frontend-url
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url
```

- Endpoints added:
  - `GET /api/whoop/connect` → Redirects to WHOOP OAuth
  - `GET /api/whoop/callback` → Validates state, exchanges code, fetches profile, posts to backend `/api/whoop/register`

Note: Implement `POST /api/whoop/register` in the backend to persist tokens and associate `whoopUserId`. The existing backend already receives webhooks at `/api/webhooks/whoop`.

### Theming

- Custom theme defined in `theme.css` with OnchainKit variables
- Pixel font integration with Pixelify Sans
- Dark/light mode support through OnchainKit

### MiniKit Provider

The app is wrapped with `MiniKitProvider` in `providers.tsx`, configured with:

- OnchainKit integration
- Access to Frames context
- Sets up Wagmi Connectors
- Sets up Frame SDK listeners
- Applies Safe Area Insets

## Customization

To get started building your own frame, follow these steps:

1. The demo components and old MoveToEarn endpoints have been removed.

2. Start building your Frame:
   - Modify `page.tsx` to create your Frame UI
   - Update theme variables in `theme.css`
   - Adjust MiniKit configuration in `providers.tsx`

3. Add your frame to your account:
   - Cast your frame to see it in action
   - Share your frame with others to start building your community

## Learn More

- [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview)
- [OnchainKit Documentation](https://docs.base.org/builderkits/onchainkit/getting-started)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
