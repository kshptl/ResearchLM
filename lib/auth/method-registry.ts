export type ProviderAuthMethodType = "api" | "oauth" | "aws-profile" | "aws-env-chain"

export type ProviderAuthMethod = {
  id: string
  label: string
  type: ProviderAuthMethodType
  description?: string
  credentialLabel?: string
  placeholder?: string
  oauthFlow?: {
    startAction: string
    pollAction?: string
    completeAction?: string
    callbackInputLabel?: string
  }
}

const genericApiMethod: ProviderAuthMethod = {
  id: "manual-api-key",
  label: "Manually enter API Key",
  type: "api",
  credentialLabel: "API key",
  placeholder: "Enter API key",
}

const openAiMethods: ProviderAuthMethod[] = [
  {
    id: "openai-chatgpt-browser",
    label: "ChatGPT Pro/Plus (browser)",
    type: "oauth",
    description: "Open browser auth and paste the callback URL or code.",
    oauthFlow: {
      startAction: "openai-browser-start",
      completeAction: "openai-browser-complete",
      callbackInputLabel: "Callback URL or authorization code",
    },
  },
  {
    id: "openai-chatgpt-headless",
    label: "ChatGPT Pro/Plus (headless)",
    type: "oauth",
    description: "Use device code flow for headless authentication.",
    oauthFlow: {
      startAction: "openai-headless-start",
      pollAction: "openai-headless-poll",
    },
  },
  genericApiMethod,
]

const anthropicMethods: ProviderAuthMethod[] = [
  {
    id: "anthropic-claude-pro-max",
    label: "Claude Pro/Max",
    type: "oauth",
    description: "Sign in with Claude account and paste the returned code.",
    oauthFlow: {
      startAction: "anthropic-max-start",
      completeAction: "anthropic-max-complete",
      callbackInputLabel: "Authorization code",
    },
  },
  {
    id: "anthropic-create-api-key",
    label: "Create an API Key",
    type: "oauth",
    description: "Authenticate and automatically mint an API key.",
    oauthFlow: {
      startAction: "anthropic-console-start",
      completeAction: "anthropic-console-complete",
      callbackInputLabel: "Authorization code",
    },
  },
  genericApiMethod,
]

const githubCopilotOauthMethod: ProviderAuthMethod = {
  id: "github-copilot-oauth",
  label: "Login with GitHub Copilot",
  type: "oauth",
  description: "Authorize with GitHub device flow.",
  oauthFlow: {
    startAction: "copilot-start",
    pollAction: "copilot-poll",
  },
}

const githubMethods: ProviderAuthMethod[] = [
  genericApiMethod,
  githubCopilotOauthMethod,
]

const githubCopilotMethods: ProviderAuthMethod[] = [
  {
    ...githubCopilotOauthMethod,
  },
]

const bedrockMethods: ProviderAuthMethod[] = [
  {
    id: "bedrock-bearer-token",
    label: "Bedrock bearer token",
    type: "api",
    description: "Stores token as AWS_BEARER_TOKEN_BEDROCK equivalent.",
    credentialLabel: "Bearer token",
    placeholder: "Enter Bedrock bearer token",
  },
  {
    id: "bedrock-aws-profile",
    label: "AWS profile",
    type: "aws-profile",
    description: "Use shared AWS profile credentials.",
    credentialLabel: "Profile name",
    placeholder: "default",
  },
  {
    id: "bedrock-env-chain",
    label: "Use AWS environment / role chain",
    type: "aws-env-chain",
    description: "Use AWS env vars, IAM role, web identity, or metadata chain.",
  },
]

const exactMethodMap: Record<string, ProviderAuthMethod[]> = {
  openai: openAiMethods,
  anthropic: anthropicMethods,
  github: githubMethods,
  "github-copilot": githubCopilotMethods,
  "github-models": githubMethods,
  bedrock: bedrockMethods,
  "amazon-bedrock": bedrockMethods,
}

export function getProviderAuthMethods(providerId: string): ProviderAuthMethod[] {
  if (exactMethodMap[providerId]) {
    return exactMethodMap[providerId]
  }

  return [genericApiMethod]
}
