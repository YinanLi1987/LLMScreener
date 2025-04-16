import OpenAI from "openai";

export async function POST(req) {
  const body = await req.json();
  const { papers, prompt, criteria, selectedLLMs } = body;

  if (!papers || !prompt || !criteria || !selectedLLMs) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ⬇️ Instantiate OpenAI inside the handler
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async function callLLM({ llmName, prompt }) {
    if (llmName === "gpt-4") {
      const res = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });
      return res.choices[0].message.content;
    }

    if (llmName === "mistral") {
      return JSON.stringify({
        pass: true,
        reason: "Mocked Mistral: Tool passed",
      });
    }

    return JSON.stringify({
      pass: "unknown",
      reason: `Mocked unknown response for ${llmName}`,
    });
  }

  async function runMultiToolAgent({ llmName, fullText, criteria }) {
    for (let i = 0; i < criteria.length; i++) {
      const tool = criteria[i];
      const prompt = `
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
        const response = await callLLM({ llmName, prompt });
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
      } catch (err) {
        return {
          result: "unknown",
          reason: `⚠️ Error evaluating Tool ${i + 1}`,
        };
      }
    }

    return {
      result: "include",
      reason: "✅ All tools passed",
    };
  }

  // Process all papers and LLMs
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
