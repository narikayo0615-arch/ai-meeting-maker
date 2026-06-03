import OpenAI from "openai";

export const config = {
  maxDuration: 60,
};

const members = [
  { role: "リサーチ担当", instruction: "事実ベースで調査し、分からないことは分からないと明記する" },
  { role: "マーケター担当", instruction: "これまでの議論を踏まえて市場性・需要・売れる切り口を分析する" },
  { role: "読者目線担当", instruction: "これまでの議論を踏まえて読者の興味・離脱ポイントを分析する" },
  { role: "批判担当", instruction: "これまでの議論の弱点・矛盾・思い込みを厳しく指摘する" },
  { role: "編集長", instruction: "全員の意見を統合し、最終結論をまとめる" },
];

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  if (req.method !== "POST") {
    res.status(405).end();
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

    const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
    const openai = new OpenAI({ apiKey });

    let discussionHistory = "";

    for (const m of members) {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "あなたはAI円卓会議の参加者です。これまでの議論を読んで、自分の役割から意見を述べてください。",
          },
          {
            role: "user",
            content: `
今日の日付：${today}
※「最新」「最近」「現在」はこの日付を基準にしてください。

会議テーマ
${theme}

これまでの議論
${discussionHistory}

あなたの役割
${m.role}

指示
${m.instruction}

過去の発言を踏まえて発言してください。
`,
          },
        ],
      });

      const text =
        response.choices?.[0]?.message?.content ||
        "回答取得に失敗しました。";

      discussionHistory += `
【${m.role}】
${text}
`;

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
