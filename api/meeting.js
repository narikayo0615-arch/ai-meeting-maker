import OpenAI from "openai";

export const config = {
  maxDuration: 60,
};

const members = [
  { role: "マーケター担当", instruction: "市場性・売れる切り口・誰に刺さるかを分析してください。" },
  { role: "読者目線担当", instruction: "読者が興味を持つ点、離脱する点、わかりにくい点を指摘してください。" },
  { role: "批判担当", instruction: "根拠が弱い点、リスク、誇張、実現性の問題を厳しく指摘してください。" },
  { role: "編集長", instruction: "最終結論を5項目で整理してください。事実と推測を分けてください。" },
];

function todayText() {
  return new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  if (req.method !== "POST") {
    res.status(405).end(
      JSON.stringify({ type: "error", message: "POSTメソッドのみ対応しています。" }) + "\n"
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
    const today = todayText();

    res.write(JSON.stringify({ type: "status", role: "リサーチ担当" }) + "\n");

    const researchResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      tools: [{ type: "web_search_preview" }],
      input: `
今日は日本時間で ${today} です。

あなたはAI会議の「リサーチ担当」です。
テーマについて、必ずWeb検索を使って最新情報を確認してください。

テーマ：
${theme}

条件：
- 「今現在」と聞かれたら、必ず ${today} 時点として扱う
- 古い情報は古いと明記する
- 公式情報・一次情報・信頼できる情報を優先する
- 不明なことは断言しない
- 推測と事実を分ける
- 「2024年現在」など古い年を現在扱いしない
- 最後に「確認できた事実」「推測」「注意点」を分けて書く
`,
    });

    const researchText =
      researchResponse.output_text ||
      "リサーチ結果を取得できませんでした。";

    res.write(
      JSON.stringify({
        type: "log",
        role: "リサーチ担当",
        text: researchText,
      }) + "\n"
    );

    let previousText = researchText;
    let finalText = "";

    for (const m of members) {
      res.write(JSON.stringify({ type: "status", role: m.role }) + "\n");

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `
あなたはAI会議の参加者です。
今日は日本時間で ${today} です。

必ずリサーチ担当の情報を前提にしてください。
リサーチにない事実を勝手に作らないでください。
不明なことは「不明」と書いてください。
古い情報を現在の事実として断言しないでください。
`,
          },
          {
            role: "user",
            content: `
会議テーマ：
${theme}

これまでのリサーチ・議論：
${previousText}

あなたの役割：
${m.role}

指示：
${m.instruction}
`,
          },
        ],
      });

      const text = response.choices?.[0]?.message?.content || "";

      res.write(
        JSON.stringify({
          type: "log",
          role: m.role,
          text,
        }) + "\n"
      );

      previousText += `\n\n【${m.role}】\n${text}`;

      if (m.role === "編集長") {
        finalText = text;
        res.write(
          JSON.stringify({
            type: "final_result",
            text: finalText,
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
