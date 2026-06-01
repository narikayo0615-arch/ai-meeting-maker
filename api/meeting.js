import OpenAI from "openai";

const members = [
  { role: "リサーチ担当", instruction: "新規性と事実ベースで具体的に出す" },
  { role: "マーケター担当", instruction: "市場性と刺さる切り口を出す" },
  { role: "読者目線担当", instruction: "読者の興味・離脱ポイントを指摘" },
  { role: "批判担当", instruction: "弱点・矛盾・実現性を厳しく指摘" },
  { role: "編集長", instruction: "最終まとめを5項目形式で出す" },
];

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/x-ndjson");

  const { theme, apiKey } = req.body;

  const openai = new OpenAI({ apiKey });

  for (const m of members) {
    const r = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "実用企画会議AI。具体的に出す。",
        },
        {
          role: "user",
          content: `テーマ:${theme}\n役割:${m.role}\n指示:${m.instruction}`,
        },
      ],
    });

    const content = JSON.parse(r.choices[0].message.content);

    res.write(
      JSON.stringify({
        type: "log",
        role: m.role,
        text: content.text || "",
      }) + "\n"
    );

    if (m.role === "編集長") {
      res.write(
        JSON.stringify({
          type: "final_result",
          text: content.text,
        }) + "\n"
      );
    }
  }

  res.write(JSON.stringify({ type: "done" }) + "\n");
  res.end();
}