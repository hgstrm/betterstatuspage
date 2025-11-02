export interface StyleRule {
  original: string;
  replacement?: string;
  explanation: string;
  caseSensitive: boolean;
}

export const styleRules: StyleRule[] = [
  { original: "outage", replacement: "service interruption, degraded performance, or elevated error rates", explanation: "We don't use the word 'outage'", caseSensitive: false },
  { original: "e-mail", replacement: "email", explanation: "", caseSensitive: false },
  { original: "Email", replacement: "email", explanation: "", caseSensitive: false },
  { original: "e-commerce", replacement: "ecommerce", explanation: "", caseSensitive: false },
  { original: "Enterprise WAF", replacement: "custom firewall rules", explanation: "", caseSensitive: false },
  { original: "end point", replacement: "endpoint", explanation: "", caseSensitive: false },
  { original: "authN", replacement: "authentication", explanation: "", caseSensitive: false },
  { original: "abort", replacement: "stop, exit, or cancel", explanation: "Avoid in general usage", caseSensitive: false },
  { original: "janky", replacement: "unreliable or of poor quality", explanation: "Use a less figurative term", caseSensitive: false },
  { original: "cripple", replacement: "slow down", explanation: "Don't use. Use more precise language", caseSensitive: false },
  { original: "kill", replacement: "stop, exit, cancel, or end", explanation: "Avoid when possible", caseSensitive: false },
  { original: "mom test", replacement: "novice user test", explanation: "Don't use mom test, grandmother test, etc.", caseSensitive: false },
  { original: "bonkers", replacement: "unexpected or complex", explanation: "Use precise language", caseSensitive: false },
  { original: "auto-scaling", replacement: "autoscaling", explanation: "", caseSensitive: false },
  { original: "first-class", replacement: "core feature", explanation: "Don't use socially-charged terms", caseSensitive: false },
  { original: "down-scope", replacement: "downscope", explanation: "", caseSensitive: false },
  { original: "blast radius", replacement: "affected area", explanation: "Use more precise terms", caseSensitive: false },
  { original: "monkey test", replacement: "automated test", explanation: "Don't use monkey to refer to people", caseSensitive: false },
  { original: "dojo", replacement: "training or workshop", explanation: "Use precise terms", caseSensitive: false },
  { original: "sanity check", replacement: "confidence check or quick check", explanation: "Use inclusive language", caseSensitive: false },
  { original: "comprise", replacement: "consist of, contain, or include", explanation: "Don't use comprise", caseSensitive: false },
  { original: "manhours", replacement: "person hours", explanation: "Avoid gendered terms", caseSensitive: false },
  { original: "user name", replacement: "username", explanation: "", caseSensitive: false },
  { original: "slice and dice", replacement: "segment data for analysis", explanation: "Use specific terms", caseSensitive: false },
  { original: "autoupdate", replacement: "automatically update", explanation: "", caseSensitive: false },
  { original: "back end", replacement: "backend", explanation: "", caseSensitive: false },
  { original: "double click", replacement: "double-click", explanation: "", caseSensitive: false },
  { original: "auto-scale", replacement: "autoscale", explanation: "", caseSensitive: false },
  { original: "preferred pronouns", replacement: "pronouns", explanation: "Use pronouns instead", caseSensitive: false },
  { original: "ab testing", replacement: "A/B Testing", explanation: "", caseSensitive: false },
  { original: "auto mode network", replacement: "auto mode VPC network", explanation: "", caseSensitive: false },
  { original: "multiregion", replacement: "multi-region", explanation: "", caseSensitive: false },
  { original: "tl;dr", replacement: "to summarize", explanation: "Use professional language", caseSensitive: false },
  { original: "dropdown", replacement: "drop-down list or menu", explanation: "In most cases use list or menu", caseSensitive: false },
  { original: "male adapter", replacement: "plug", explanation: "Use genderless terms", caseSensitive: false },
  { original: "guys", replacement: "everyone or folks", explanation: "Use non-gendered language", caseSensitive: false },
  { original: "k8s", replacement: "Kubernetes", explanation: "", caseSensitive: false },
  { original: "multi tenant", replacement: "multi-tenant", explanation: "", caseSensitive: false },
  { original: "android", replacement: "Android", explanation: "", caseSensitive: true },
  { original: "Alpha", replacement: "alpha", explanation: "unless part of Product Name", caseSensitive: true },
  { original: "chubby", replacement: "overextended or unused", explanation: "Use precise language", caseSensitive: false },
  { original: "left click", replacement: "left-click", explanation: "", caseSensitive: false },
  { original: "docs", replacement: "documentation", explanation: "", caseSensitive: false },
  { original: "markdown", replacement: "Markdown", explanation: "", caseSensitive: false },
  { original: "baz", replacement: "use clearer placeholder", explanation: "Needs clearer and more meaningful placeholder name", caseSensitive: false },
  { original: "omnibox", replacement: "address bar", explanation: "", caseSensitive: false },
  { original: "emojis", replacement: "emoji", explanation: "Use emoji for both singular and plural", caseSensitive: false },
  { original: "retarded", replacement: "slowed", explanation: "Don't use", caseSensitive: false },
  { original: "data store", replacement: "datastore", explanation: "", caseSensitive: false },
  { original: "material design", replacement: "Material Design", explanation: "", caseSensitive: false },
  { original: "manned", replacement: "staffed or crewed", explanation: "Avoid gendered terms", caseSensitive: false },
  { original: "second-class", replacement: "feature", explanation: "Don't use socially-charged terms", caseSensitive: false },
  { original: "sherpa", replacement: "guide", explanation: "Use more precise terms", caseSensitive: false },
  { original: "front end", replacement: "frontend", explanation: "", caseSensitive: false },
  { original: "filesystem", replacement: "file system", explanation: "", caseSensitive: false },
  { original: "FinTech", replacement: "fintech", explanation: "Write out on first mention: financial technology (fintech)", caseSensitive: false },
  { original: "for instance", replacement: "for example or such as", explanation: "Avoid when possible", caseSensitive: false },
  { original: "NA", replacement: "N/A", explanation: "", caseSensitive: false },
  { original: "nextjs", replacement: "Next.js", explanation: "", caseSensitive: false },
  { original: "Trojan", replacement: "trojan", explanation: "One is a brand, the other is malware", caseSensitive: false },
  { original: "fat", replacement: "high-capacity", explanation: "Don't use. Use precise modifiers", caseSensitive: false },
  { original: "datatype", replacement: "data type", explanation: "", caseSensitive: false },
  { original: "severless", replacement: "serverless", explanation: "", caseSensitive: false },
  { original: "hack-a-thon", replacement: "hackathon", explanation: "", caseSensitive: false },
  { original: "blackhat", replacement: "violation of fair use", explanation: "Don't use. Use precise terms", caseSensitive: false },
  { original: "crazy", replacement: "complex or unexpected", explanation: "Use precise language", caseSensitive: false },
  { original: "file name", replacement: "filename", explanation: "", caseSensitive: false },
  { original: "life time", replacement: "lifetime", explanation: "", caseSensitive: false },
  { original: "blind writes", replacement: "write operation without a read operation", explanation: "Avoid using blind writes", caseSensitive: false },
  { original: "multi tenancy", replacement: "multi-tenancy", explanation: "", caseSensitive: false },
  { original: "ghetto", replacement: "inelegant or workaround", explanation: "Use precise, professional terms", caseSensitive: false },
  { original: "cellular data", replacement: "mobile data", explanation: "", caseSensitive: false },
  { original: "backoff", replacement: "back off", explanation: "", caseSensitive: false },
  { original: "U.S.A.", replacement: "US", explanation: "", caseSensitive: false },
  { original: "host name", replacement: "hostname", explanation: "", caseSensitive: false },
  { original: "U.S.", replacement: "US", explanation: "", caseSensitive: false },
  { original: "blind people", replacement: "visually impaired people", explanation: "Use person-first language", caseSensitive: false },
  { original: "data cleansing", replacement: "data cleaning", explanation: "", caseSensitive: false },
  { original: "lame", replacement: "deficient or inadequate", explanation: "Use precise language", caseSensitive: false },
  { original: "wild card", replacement: "wildcard", explanation: "", caseSensitive: false },
  { original: "opensource", replacement: "open source", explanation: "", caseSensitive: false },
  { original: "TurboRepo", replacement: "Turborepo", explanation: "It's Turborepo not TurboRepo", caseSensitive: true },
  { original: "fin-tech", replacement: "fintech", explanation: "Write out on first mention: financial technology (fintech)", caseSensitive: false },
  { original: "built in", replacement: "built-in", explanation: "", caseSensitive: false },
  { original: "allows you to", replacement: "lets you", explanation: "", caseSensitive: false },
  { original: "auto-healing", replacement: "autohealing", explanation: "", caseSensitive: false },
  { original: "turbo", replacement: "Turborepo", explanation: "Only use turbo for npm package", caseSensitive: false },
  { original: "housekeeping", replacement: "maintenance or cleanup", explanation: "Use precise terms", caseSensitive: false },
  { original: "gimp", replacement: "don't use", explanation: "Use precise, non-figurative language", caseSensitive: false },
  { original: "ymmv", replacement: "your results might vary", explanation: "", caseSensitive: false },
  { original: "deep-linking", replacement: "deep linking", explanation: "", caseSensitive: false },
  { original: "in order to", replacement: "to", explanation: "", caseSensitive: false },
  { original: "co-locate", replacement: "colocate", explanation: "", caseSensitive: false },
  { original: "cell phone", replacement: "mobile phone or mobile device", explanation: "Don't use cell phone", caseSensitive: false },
  { original: "dummy variable", replacement: "placeholder", explanation: "Don't use dummy variable", caseSensitive: false },
  { original: "blind change", replacement: "change without first confirming the value", explanation: "Avoid using blind change", caseSensitive: false },
  { original: "webpage", replacement: "web page", explanation: "", caseSensitive: false },
  { original: "aka", replacement: "also known as", explanation: "Or choose an alternative", caseSensitive: false },
  { original: "auto populate", replacement: "autopopulate", explanation: "", caseSensitive: false },
  { original: "check box", replacement: "checkbox", explanation: "", caseSensitive: false },
  { original: "smartphone", replacement: "mobile phone", explanation: "", caseSensitive: false },
  { original: "3-D", replacement: "3D", explanation: "", caseSensitive: false },
  { original: "addon", replacement: "add-on", explanation: "", caseSensitive: false },
  { original: "time frame", replacement: "timeframe", explanation: "", caseSensitive: false },
  { original: "getServerProps", replacement: "getServerSideProps", explanation: "", caseSensitive: false },
  { original: "datasource", replacement: "data source", explanation: "", caseSensitive: false },
  { original: "authZ", replacement: "authorization", explanation: "", caseSensitive: false },
  { original: "curated roles", replacement: "predefined roles", explanation: "", caseSensitive: false },
  { original: "blind", replacement: "ignore", explanation: "Avoid using blind to or blind eye to", caseSensitive: false },
  { original: "simple", replacement: "", explanation: "What might be simple for you might not be simple for others", caseSensitive: false },
  { original: "blackhole", replacement: "dropped without notification", explanation: "Use descriptive terms", caseSensitive: false },
  { original: "code lab", replacement: "codelab", explanation: "", caseSensitive: false },
  { original: "guru", replacement: "expert", explanation: "Use precise terms", caseSensitive: false },
  { original: "right click", replacement: "right-click", explanation: "", caseSensitive: false },
  { original: "Github", replacement: "GitHub", explanation: "GitHub should be capitalized correctly", caseSensitive: true },
  { original: "datacenter", replacement: "data center", explanation: "", caseSensitive: false },
  { original: "data set", replacement: "dataset", explanation: "", caseSensitive: false },
  { original: "url", replacement: "URL", explanation: "", caseSensitive: true },
  { original: "manmade", replacement: "manufactured or synthetic", explanation: "Avoid gendered terms", caseSensitive: false },
  { original: "spin up", replacement: "start or create", explanation: "Use less colloquial terms", caseSensitive: false },
  { original: "female adapter", replacement: "socket", explanation: "Use genderless terms", caseSensitive: false },
  { original: "grandfathered", replacement: "legacy or exempt", explanation: "Don't use grandfathered", caseSensitive: false },
  { original: "sexy", replacement: "powerful or elegant", explanation: "Use precise, professional words", caseSensitive: false },
  { original: "cpu", replacement: "CPU", explanation: "", caseSensitive: false },
  { original: "manpower", replacement: "staff or workforce", explanation: "Avoid gendered terms", caseSensitive: false },
  { original: "custom firewalls", replacement: "custom firewall rules", explanation: "", caseSensitive: false },
  { original: "NOSQL", replacement: "NoSQL", explanation: "", caseSensitive: true },
  { original: "down scope", replacement: "downscope", explanation: "", caseSensitive: false },
  { original: "meta data", replacement: "metadata", explanation: "", caseSensitive: false },
  { original: "nuke", replacement: "remove or delete", explanation: "Use precise language", caseSensitive: false },
  { original: "auto-populate", replacement: "autopopulate", explanation: "", caseSensitive: false },
  { original: "cellular network", replacement: "mobile network", explanation: "", caseSensitive: false },
  { original: "touch screen", replacement: "touchscreen", explanation: "", caseSensitive: false },
  { original: "live stream", replacement: "livestream", explanation: "", caseSensitive: false },
  { original: "code base", replacement: "codebase", explanation: "", caseSensitive: false },
  { original: "life cycle", replacement: "lifecycle", explanation: "", caseSensitive: false },
  { original: "health care", replacement: "healthcare", explanation: "", caseSensitive: false },

];

export function checkStyleGuide(text: string): Array<{ original: string; replacement?: string; explanation: string }> {
  const violations: Array<{ original: string; replacement?: string; explanation: string }> = [];
  const foundViolations = new Set<string>();

  for (const rule of styleRules) {
    const flags = rule.caseSensitive ? 'g' : 'gi';
    // Escape special regex characters in the original text
    const escapedOriginal = rule.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedOriginal}\\b`, flags);

    if (regex.test(text)) {
      // Use lowercase key to avoid duplicate warnings for same word
      const key = rule.original.toLowerCase();
      if (!foundViolations.has(key)) {
        foundViolations.add(key);
        violations.push({
          original: rule.original,
          replacement: rule.replacement,
          explanation: rule.explanation
        });
      }
    }
  }

  return violations;
}
