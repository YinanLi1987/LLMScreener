import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

interface LLMEvaluation {
  result: "yes" | "no" | "unknown";
  reason: string;
}

export async function evaluateWithLLM(
  llmType: string,
  prompt: string,
  text: string
): Promise<LLMEvaluation> {
  // 1. 初始化模型
  const model = new ChatOpenAI({
    modelName: llmType.includes("gpt") ? llmType : "gpt-4",
    temperature: 0.1,
  });

  // 2. 构建系统提示
  const systemPrompt = `
  You are a research paper screening assistant. Evaluate whether the paper should be included based on these criteria:
  ${prompt}

  Respond STRICTLY in this JSON format:
  {
    "result": "yes" | "no" | "unknown",
    "reason": "string (detailed explanation)"
  }

  Guidelines:
  - "yes": Paper clearly meets ALL criteria
  - "no": Paper clearly does NOT meet criteria
  - "unknown": Cannot determine based on available information
  `;

  try {
    // 3. 调用LLM
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Paper content:\n${text}`),
    ]);

    // 4. 解析响应
    let evaluation: LLMEvaluation;
    try {
      evaluation = JSON.parse(response.content.toString());
    } catch {
      // 如果返回的不是标准JSON，尝试提取关键信息
      const content = response.content.toString().toLowerCase();
      evaluation = {
        result: content.includes("yes")
          ? "yes"
          : content.includes("no")
          ? "no"
          : "unknown",
        reason: response.content.toString(),
      };
    }

    // 5. 验证结果格式
    if (!["yes", "no", "unknown"].includes(evaluation.result)) {
      evaluation.result = "unknown";
    }

    return evaluation;
  } catch (error) {
    console.error("LLM evaluation error:", error);
    return {
      result: "unknown",
      reason: "Evaluation failed due to system error",
    };
  }
}
