import OpenAI from "openai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      type: "error",
      message: "POST専用です。"
    });
  }

  const { theme, apiKey } = req.body || {};

  if (!theme || !apiKey) {
    return res.status(400).json({
      type: "error",
      message: "テーマまたはAPIキーがありません。"
    });
  }

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",

      tools: [
        {
          type: "web_search_preview"
        }
      ],

      input: `
あなたはAI会議メーカーのリサーチ担当です。

会議テーマ
${theme}

必ずWeb検索を実行してください。

一般論は禁止です。

最低3件以上について以下を出力してください。

・商品名
・メーカー名
・発売時期または発表時期
・特徴
・情報源に基づく補足

不明な場合は推測せず「不明」と書いてください。
`
    });

    return res.status(200).json({
      type: "web_search_test",
      role: "リサーチ担当",
      text: response.output_text || "回答取得失敗"
    });

  } catch (error) {
    return res.status(500).json({
      type: "error",
      message: error.message
    });
  }
}
