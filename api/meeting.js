import OpenAI from "openai";

export const config = {
  maxDuration: 60,
};

const members = [
  { role: "リサーチ担当", instruction: "新規性と事実ベースで具体的に出す" },
  { role: "マーケター担当", instruction: "市場性と刺さる切り口を出す" },
  { role: "読者目線担当", instruction: "読者の興味・離脱ポイントを指摘" },
  { role: "批判担当", instruction: "弱点・矛盾・実現性を厳しく指摘" },
  { role: "編集長", instruction: "最終まとめを5項目形式で出す" },
];

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  if (req.method !== "POST") {
    res.status(405).end(
      JSON.stringify({
        type: "error",
        message: "POSTメソッドのみ対応しています。",
      }) + "\n"
    );
    return;
  }

  try {
    const { theme, apiKey } = req.body || {};

    if (!theme || !apiKey) {
      res.write(
        JSON.stringify({
          type: "error",
          message: "テーマまたはAPIキーがありません。",
        }) + "\n"
      );
      res.end();
      return;
    }

    const openai = new OpenAI({ apiKey });

    for (const m of members) {
      res.write(
        JSON.stringify({
          type: "status",
          role: m.role,
        }) + "\n"
      );

      const r = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'あなたは実用企画会議AIです。必ずJSON形式で返してください。形式は {"text":"ここに回答"} のみです。',
          },
          {
            role: "user",
            content: `テーマ:${theme}\n役割:${m.role}\n指示:${m.instruction}\n\n必ず {"text":"回答本文"} のJSONだけで返してください。`,
          },
        ],
      });

      let text = "";

      try {
        const content = JSON.parse(r.choices[0].message.content || "{}");
        text = content.text || "";
      } catch {
        text = r.choices[0].message.content || "";
      }

      res.write(
        JSON.stringify({
          type: "log",
          role: m.role,
          text,
        }) + "\n"
      );

      if (m.role === "編集長") {
        res.write(
          JSON.stringify({
            type: "final_result",
            text,
          }) + "\n"
        );
      }
    }

    res.write(JSON.stringify({ type: "done" }) + "\n");
    res.end();
  } catch (error) {
    res.write(
      JSON.stringify({
        type: "error",
        message: error.message || "AI会議の生成に失敗しました。",
      }) + "\n"
    );
    res.end();
  }
}
