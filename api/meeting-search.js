import OpenAI from "openai";

export const config = {
  maxDuration: 60,
};

const members = [
  { role: "リサーチ担当", instruction: "最新情報・事実ベース・不明は不明と明記" },
  { role: "マーケター担当", instruction: "市場性・需要・売れる切り口を分析" },
  { role: "読者目線担当", instruction: "読者の興味・離脱ポイントを分析" },
  { role: "批判担当", instruction: "弱点・矛盾・リスクを指摘" },
  { role: "編集長", instruction: "全体統合して結論" },
];

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { theme, apiKey } = req.body || {};

  if (!theme || !apiKey) {
    return res.status(400).json({
      type: "error",
      message: "テーマまたはAPIキーがありません"
    });
  }

  const openai = new OpenAI({ apiKey });

  let discussionHistory = "";

  try {
    for (const m of members) {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              m.role === "リサーチ担当"
                ? "あなたは最新情報を調査するリサーチAIです。事実ベースで回答してください。"
                : "あなたはAI円卓会議の参加者です。"
          },
          {
            role: "user",
            content: `
テーマ:
${theme}

これまでの議論:
${discussionHistory}

役割:
${m.role}

指示:
${m.instruction}
`
          }
        ],
      });

      const text =
        response.choices?.[0]?.message?.content || "取得失敗";

      discussionHistory += `\n【${m.role}】\n${text}\n`;

      res.write(
        JSON.stringify({
          type: "log",
          role: m.role,
          text
        }) + "\n"
      );

      if (m.role === "編集長") {
        res.write(
          JSON.stringify({
            type: "final_result",
            text
          }) + "\n"
        );
      }
    }

    res.write(JSON.stringify({ type: "done" }) + "\n");
    res.end();

  } catch (error) {
    res.status(500).json({
      type: "error",
      message: error.message
    });
  }
}
