# BetterStatuspage

**Never get locked out of your status page again.** A self-hostable backup interface that lets you manage your Atlassian Statuspage even when the official UI is down or their authentication isn't letting you in.

[Video Demo](https://share.cleanshot.com/YcNkgZDS)

## The Problem

AWS outage showed us that Statuspage authentication can go down. This tool solves that by only using their Statuspage.

## Why

✅ **Works when Statuspage UI is down** - Direct API access bypasses authentication failures  
✅ **Test/Staging Mode** - Practice incident workflows without affecting production  
✅ **AI-powered message improvement** - Transform rough notes into professional status updates  
✅ **Template management** - Create and manage templates directly from the UI  
✅ **Preview before publishing** - See exactly what changes before they go live  
✅ **Self-hosted** - Run locally or deploy anywhere, full control  
✅ **Secure** - API keys stay server-side, never exposed to browsers  

## Quick Start

### 1. Get Your API Credentials

From your Statuspage settings, get:
- **API Key** (with read/write permissions)
- **Page ID**

### 2. Install & Run

```bash
# Clone and install
git clone <repo-url>
cd betterstatuspage
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run locally
npm run dev
```


### 3. Start Managing Your Status Page

Access `http://localhost:3000` and:
- Update component statuses
- Create and update incidents
- Use AI to improve your messages
- Manage templates from the UI
- **Enable Test Mode** - Toggle test mode in the header to practice workflows without affecting production

## AI Message Improvement

Transform rough technical notes into professional status updates with a smart fallback system:

1. **Chrome AI** - Free, on-device processing (Chrome 138+) - **Primary in demo mode**
2. **AI Gateway** (OpenAI/Anthropic) - Supports multiple models - **Disabled in demo mode**
3. **Local rules** - Always works, rule-based improvements

**Note:** In demo mode (`NEXT_PUBLIC_PREVIEW_DEMO_MODE=true`), only Chrome AI is available. AI Gateway is automatically disabled.

### Enable AI Gateway (Optional)

```bash
# Add to .env.local:
AI_GATEWAY_API_KEY=your_ai_gateway_key
```

Supports OpenAI, Anthropic, and hundreds of other models through a unified API.

## Key Features

- **🔄 Backup Access**: Update statuspage when official UI is unavailable
- **🧪 Test/Staging Mode**: Practice incident workflows without affecting production - perfect for training and drills
- **🤖 AI Enhancement**: Improve messages automatically with multi-tier AI fallback
- **📝 Template Management**: Create, edit, and organize templates from the UI
- **👁️ Preview Changes**: See exactly what will be published before posting
- **🔒 Secure**: All API keys stored server-side, never exposed to browsers
- **🌐 Offline Mode**: Cached data works when API is temporarily unavailable
- **⚙️ Configurable**: Full control over AI behavior, style rules, and UI

## Configuration

### Environment Variables

**Required:**
```bash
STATUSPAGE_API_KEY=your_api_key
STATUSPAGE_PAGE_ID=your_page_id
```

**Optional:**
```bash
BACKUP_PASSWORD=your_password           # Password protect the tool
AI_GATEWAY_API_KEY=your_key            # Enable AI Gateway improvements
NEXT_PUBLIC_PREVIEW_DEMO_MODE=true     # Lock preview page to always show demo/test mode (only Chrome AI available)
```

### Customize AI Behavior

Edit `config.json` to customize:
- AI system prompts and instructions
- Style guidelines and writing rules
- Word and phrase replacements
- UI labels and colors

**Templates** are managed directly from your Statuspage via the API. Use the Templates tab in the config page to create and edit templates.

## Use Cases

- **During outages**: When you can't access Statuspage UI, update statuses via API
- **Test/Staging**: Practice incident response workflows, test notification systems, and train team members without creating real incidents
- **Team collaboration**: Multiple team members can update statuspage simultaneously
- **Message quality**: AI ensures professional, consistent communication
- **Template reuse**: Build a library of templates for common scenarios
- **Training AI**: Learn from reference statuspages to match your writing style

## Security

- ✅ API keys stored server-side only (never exposed to browser)
- ✅ Session-based authentication with HTTP-only cookies
- ✅ All API routes protected with authentication
- ✅ Optional password protection for the tool itself
- ✅ Works with 1Password CLI for zero-secret deployments

All API keys are stored server-side only and never exposed to browsers. Session-based authentication uses HTTP-only cookies for security.

## Troubleshooting

**Can't see components**
→ Verify API key has read permissions and Page ID is correct

**Updates not working**
→ Ensure API key has write permissions, check error messages in modals

**AI not working**
→ Verify `AI_GATEWAY_API_KEY` in `.env.local`, or use the local fallback (always works)

## License

MIT - Use freely for your organization
