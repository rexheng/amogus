import Anthropic from "@anthropic-ai/sdk";
import type { ContextBrief, ReconResult } from "./types.js";

const client = new Anthropic();

/**
 * Recon phase: extract key topics from the prompt, run web searches,
 * and compile a context brief for the council.
 *
 * For hackathon MVP: uses Claude to generate search queries,
 * then uses Claude's web search tool to gather real context.
 * Falls back to Claude's training knowledge if web search is unavailable.
 */
export async function runRecon(prompt: string): Promise<ContextBrief> {
  // Step 1: Extract search queries from the prompt
  const queryResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Given this project prompt, generate 3-5 focused web search queries that would gather useful technical context for planning. Return ONLY a JSON array of strings, nothing else.

Prompt: "${prompt}"`,
      },
    ],
  });

  let queries: string[] = [];
  const queryText =
    queryResponse.content[0].type === "text" ? queryResponse.content[0].text : "";
  try {
    queries = JSON.parse(queryText);
  } catch {
    // Fallback: extract from the prompt itself
    queries = [prompt.slice(0, 100)];
  }

  // Step 2: Gather context using Claude as a research assistant
  // For the hackathon, we use Claude's knowledge as the "search" layer.
  // In production, this would hit real search APIs.
  const searchResults: ReconResult[] = [];

  const researchResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a research assistant. For each search query below, provide 2-3 concise factual snippets (each 1-2 sentences) with relevant technical information. Focus on architecture patterns, technology choices, common pitfalls, and best practices.

Search queries:
${queries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Respond in this exact JSON format:
{
  "results": [
    { "query": "the search query", "snippets": ["snippet 1", "snippet 2"] }
  ]
}`,
      },
    ],
  });

  const researchText =
    researchResponse.content[0].type === "text" ? researchResponse.content[0].text : "";
  try {
    const parsed = JSON.parse(researchText);
    searchResults.push(...parsed.results);
  } catch {
    searchResults.push({
      query: prompt,
      snippets: ["Research context unavailable — council will deliberate with training knowledge only."],
    });
  }

  // Step 3: Compile into a brief
  const summary = searchResults
    .map((r) => `[${r.query}]\n${r.snippets.map((s) => `• ${s}`).join("\n")}`)
    .join("\n\n");

  return {
    searches: searchResults,
    summary: summary.slice(0, 3000), // Cap at ~3000 chars
  };
}
