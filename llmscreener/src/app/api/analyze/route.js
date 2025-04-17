import OpenAI from "openai";

export async function POST(req) {
  const body = await req.json();
  const { papers, prompt, criteria, selectedLLMs } = body;

  if (!papers || !prompt || !criteria || !selectedLLMs) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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
    for (let i = 0; i < criteria.length; i++) {
      const tool = criteria[i];

      const toolPrompt = `
Tool ${i + 1}: ${tool}

Paper:
${fullText}

Evaluate the paper strictly against this tool.

Reply ONLY with valid JSON:
{
  "pass": true | false | "unknown",
  "reason": "..."
}

- Use true if clearly satisfied
- Use false if clearly fails
- Use "unknown" if unsure
`.trim();

      try {
        const response = await callLLM({ llmName, prompt: toolPrompt });
        const parsed = JSON.parse(response);

        if (parsed.pass === false) {
          return {
            result: "exclude",
            reason: `❌ Tool ${i + 1} failed: ${parsed.reason}`,
          };
        }

        if (parsed.pass === "unknown") {
          return {
            result: "unknown",
            reason: `🤷 Tool ${i + 1} was inconclusive: ${parsed.reason}`,
          };
        }

        // Continue to next tool if passed
      } catch (err) {
        console.error(`❌ Error parsing tool ${i + 1} result:`, err);
        return {
          result: "unknown",
          reason: `⚠️ Tool ${i + 1} parse error: ${err.message}`,
        };
      }
    }

    return {
      result: "include",
      reason: "✅ All tools passed",
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
