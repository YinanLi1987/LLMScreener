import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req) {
  const body = await req.json();
  const { papers, prompt, criteria, selectedLLMs } = body;

  if (!papers || !prompt || !criteria || !selectedLLMs) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  async function callLLM({ llmName, prompt }) {
    console.log(`🧠 Prompt sent to ${llmName}:\n${prompt}`);

    if (llmName === "gpt-4") {
      try {
        const res = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        });

        const content = res.choices[0].message.content.trim();

        // 尝试只提取 JSON 部分
        const match = content.match(/{[\s\S]+}/);
        if (!match) throw new Error("LLM response is not valid JSON");

        const jsonStr = match[0];
        console.log("📩 GPT-4 response:", jsonStr);
        return jsonStr;
      } catch (error) {
        console.error("💥 GPT-4 error:", error);
        return JSON.stringify({
          pass: "unknown",
          reason: `Failed to parse GPT-4 response: ${error.message}`,
        });
      }
    }
    if (llmName === "claude-3") {
      try {
        const res = await anthropic.messages.create({
          model: "claude-3-opus-20240229", // Claude 3 Opus
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const content = res.content[0]?.text?.trim();
        const match = content.match(/{[\s\S]+}/);
        if (!match) throw new Error("Claude response is not valid JSON");
        return match[0];
      } catch (error) {
        console.error("💥 Claude error:", error);
        return JSON.stringify({
          pass: "unknown",
          reason: `Failed to parse Claude response: ${error.message}`,
        });
      }
    }
    // Mock for Mistral or other models
    if (llmName === "mistral") {
      return JSON.stringify({
        pass: true,
        reason: "Mocked Mistral: Tool passed",
      });
    }

    return JSON.stringify({
      pass: "unknown",
      reason: `LLM "${llmName}" not implemented`,
    });
  }

  async function runMultiToolAgent({ llmName, fullText, criteria }) {
    let lastExtracted = {};

    for (let i = 0; i < criteria.length; i++) {
      const tool = criteria[i];

      const toolPrompt = `
Tool ${i + 1}: ${tool}

Paper:
${fullText}

Evaluate the paper strictly against this tool.
For each extracted element, also return the sentence(s) it was found in under a field called 'evidence'

Reply ONLY with valid JSON:
{
  "pass": true | false | "unknown",
  "reason": "...",
  "extracted": {
    "Population": ["manure-borne microorganisms", "indigenous soil microorganisms"]
  },
  "evidence": {
    "Population": [
      "This study examined manure-borne microorganisms and indigenous soil microorganisms in treated fields."
    ]
  }
}

- Use true if clearly satisfied
- Use false if clearly fails
- Use "unknown" if unsure
`.trim();

      try {
        const response = await callLLM({ llmName, prompt: toolPrompt });
        const parsed = JSON.parse(response);
        const extracted = parsed.extracted || {};
        const evidence = parsed.evidence || {};

        if (parsed.pass === false) {
          return {
            result: "exclude",
            reason: `❌ Tool ${i + 1} failed: ${parsed.reason}`,
            extracted,
            evidence,
          };
        }

        if (parsed.pass === "unknown") {
          return {
            result: "unknown",
            reason: `🤷 Tool ${i + 1} was inconclusive: ${parsed.reason}`,
            extracted,
            evidence,
          };
        }
        lastExtracted = lastExtracted = { extracted, evidence };
        // Continue to next tool if passed
      } catch (err) {
        console.error(`❌ Error parsing tool ${i + 1} result:`, err);
        return {
          result: "unknown",
          reason: `⚠️ Tool ${i + 1} parse error: ${err.message}`,
          extracted: {},
          evidence: {},
        };
      }
    }

    return {
      result: "include",
      reason: "✅ All tools passed",
      extracted: lastExtracted.extracted || {},
      evidence: lastExtracted.evidence || {},
    };
  }

  const results = [];

  for (const paper of papers) {
    const { id, title, abstract, keywords } = paper;
    const fullText = `${title}\n${abstract}\nKeywords: ${keywords}`;
    const evaluations = {};

    for (const llm of selectedLLMs) {
      const evalResult = await runMultiToolAgent({
        llmName: llm,
        fullText,
        criteria,
      });

      evaluations[llm] = evalResult;
    }

    results.push({
      id,
      title,
      abstract,
      keywords,
      evaluations,
      expanded: false,
    });
  }

  return Response.json({ results });
}
