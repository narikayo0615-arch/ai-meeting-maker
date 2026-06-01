export default async function handler(req, res) {
  res.status(200).json({
    success: true,
    message: "meeting-search.js 動作確認成功",
  });
}
