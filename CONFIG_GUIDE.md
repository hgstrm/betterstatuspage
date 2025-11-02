# Configuration Guide

This project uses a centralized configuration file (`config.json`) to manage all AI instructions, style rules, and message templates.

## Why Centralized Config?

Instead of having AI prompts and rules scattered across multiple files, everything is now in one place:

- **Easy to edit** - Change AI behavior without touching code
- **Consistent** - All AI providers use the same rules
- **Maintainable** - Update style guidelines in one file
- **Portable** - Share config across deployments

## File Structure

```
config.json
├── ai
│   ├── systemPrompt          # Base instructions for AI
│   ├── styleGuidelines        # Writing rules (tone, voice, etc.)
│   ├── examples              # Input/output examples
│   ├── bannedWords           # Words to avoid
│   └── productNames          # Proper product capitalization
├── styleGuide
│   └── rules                 # Comprehensive style guide rules
└── templates
    ├── investigating          # "We are investigating..." templates
    ├── identified            # "We have identified..." templates
    ├── monitoring            # "We are monitoring..." templates
    └── resolved              # "This has been resolved..." templates
```

## How It Works

### AI Modules Read from Config

All AI integrations automatically load settings from `config.json`:

- **AI Gateway** (`lib/ai-gateway.ts`) - Uses `buildSystemPrompt()` and AI Gateway API
- **Chrome AI** (`lib/chrome-ai.ts`) - Uses `aiConfig` for guidelines
- **Local AI** (`lib/local-ai-improver.ts`) - Uses `getBannedWords()` and `getProductNames()`

### Usage in Code

```typescript
import { buildSystemPrompt, getBannedWords, getTemplate } from './ai-config';

// Get full AI system prompt
const prompt = buildSystemPrompt();

// Get banned words list
const banned = getBannedWords();

// Get pre-written template
const message = getTemplate('investigating', 'major');
```

## Customization

### Add a Banned Word

Edit `config.json`:

```json
{
  "ai": {
    "bannedWords": [
      {
        "word": "failure",
        "replacement": "issue"
      }
    ]
  }
}
```

### Add a Product Name

```json
{
  "ai": {
    "productNames": [
      {
        "incorrect": ["my product", "myproduct"],
        "correct": "My Product"
      }
    ]
  }
}
```

### Add a Message Template

```json
{
  "templates": {
    "investigating": {
      "minor": "Your custom template here..."
    }
  }
}
```

### Modify AI Style Guidelines

```json
{
  "ai": {
    "styleGuidelines": [
      "Your guideline here",
      "Another guideline"
    ]
  }
}
```

## Examples

### Before (Hardcoded in Code)

```typescript
// lib/ai-gateway.ts
const systemPrompt = `You are a professional technical writing assistant...
STYLE GUIDELINES:
- Professional but approachable tone
- Active voice, present tense
...
`;
```

### After (Config-Driven)

```typescript
// lib/ai-gateway.ts
import { buildSystemPrompt } from './ai-config';
const systemPrompt = buildSystemPrompt();
```

Now you edit `config.json` instead of code!

## Style Guide Integration

**NEW:** The AI now automatically follows **all style rules** from `lib/style-guide.ts`!

### How It Works

When AI improves a message:

1. System loads rules from `style-guide.ts` (174+ rules)
2. Filters for rules with explanations (most important ones)
3. Adds them to the AI system prompt automatically
4. AI applies these rules when rewriting messages

### What Gets Included

- **Chrome AI**: Top 10 style rules (smaller context window)
- **Local AI**: Uses all rules for pattern matching

### Examples of Rules Applied

- "outage" → "service interruption" (banned word)
- "nextjs" → "Next.js" (product capitalization)
- "serverless functions" → "Serverless Functions" (capitalization)
- "kill" → "stop, exit, cancel" (avoid violent language)
- "sanity check" → "confidence check" (inclusive language)

**No manual syncing needed!** Edit `style-guide.ts` and AI instantly uses the new rules.

## Files Modified

- ✅ `lib/ai-config.ts` - Config loader + style guide integration
- ✅ `lib/ai-gateway.ts` - Uses config + style rules
- ✅ `lib/chrome-ai.ts` - Uses config + top 10 style rules
- ✅ `lib/local-ai-improver.ts` - Uses config for templates
- ✅ `config.json` - Central configuration file
- ✅ `lib/style-guide.ts` - Comprehensive style guide (unchanged)

## Benefits

1. **Non-developers can customize** - No code changes needed
2. **Version control** - Track config changes in git
3. **Environment-specific configs** - Different settings per deployment
4. **A/B testing** - Easily try different prompts
5. **Documentation** - All rules in one readable file

## Testing Changes

After editing `config.json`:

```bash
npm run build  # Verify it compiles
npm run dev    # Test locally
```

The changes take effect immediately - no code changes needed!
