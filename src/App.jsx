import { useState } from "react";
import "./App.css";

const members = [
  { role: "リサーチ担当", desc: "情報収集・分析", icon: "🔍", className: "research" },
  { role: "マーケター担当", desc: "市場・ニーズ分析", icon: "📊", className: "marketing" },
  { role: "読者目線担当", desc: "読者の視点で評価", icon: "👤", className: "reader" },
  { role: "批判担当", desc: "問題点・リスク指摘", icon: "⚠️", className: "critic" },
  { role: "編集長", desc: "まとめ・結論", icon: "⭐", className: "editor" },
];

function App() {
  const savedKey = localStorage.getItem("openai_api_key") || "";
  const savedHistories = JSON.parse(localStorage.getItem("meeting_histories") || "[]");

  const [theme, setTheme] = useState("");
  const [apiKey, setApiKey] = useState(savedKey);
  const [isApiKeySaved, setIsApiKeySaved] = useState(!!savedKey);
  const [isApiKeyEditing, setIsApiKeyEditing] = useState(!savedKey);

  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState([]);
  const [finalResult, setFinalResult] = useState("");
  const [histories, setHistories] = useState(savedHistories);
  const [openLogIds, setOpenLogIds] = useState([]);
  const [isMeeting, setIsMeeting] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const maxLength = 500;

  const getMemberClassName = (role) => {
    const member = members.find((item) => item.role === role);
    return member ? member.className : "";
  };

  const toggleLog = (id) => {
    setOpenLogIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openAllLogs = () => {
    setOpenLogIds(logs.map((log) => log.id));
  };

  const closeAllLogs = () => {
    setOpenLogIds([]);
  };

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      alert("APIキーを入力してください。");
      return;
    }

    localStorage.setItem("openai_api_key", apiKey.trim());
    setIsApiKeySaved(true);
    setIsApiKeyEditing(false);
    alert("APIキーを保存しました。");
  };

  const deleteApiKey = () => {
    localStorage.removeItem("openai_api_key");
    setApiKey("");
    setIsApiKeySaved(false);
    setIsApiKeyEditing(true);
    alert("APIキーを削除しました。");
  };

  const saveMeetingHistory = (meetingTheme, meetingLogs, meetingFinalResult) => {
    if (!meetingTheme.trim() || meetingLogs.length === 0) return;

    const newHistory = {
      id: Date.now(),
      date: new Date().toLocaleString("ja-JP"),
      theme: meetingTheme,
      logs: meetingLogs,
      finalResult: meetingFinalResult || "",
    };

    const nextHistories = [newHistory, ...histories].slice(0, 30);
    setHistories(nextHistories);
    localStorage.setItem("meeting_histories", JSON.stringify(nextHistories));
  };

  const openHistory = (history) => {
    setTheme(history.theme);
    setLogs(history.logs);
    setFinalResult(history.finalResult || "");
    setOpenLogIds(history.logs.map((log) => log.id));
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteHistory = (id) => {
    const nextHistories = histories.filter((item) => item.id !== id);
    setHistories(nextHistories);
    localStorage.setItem("meeting_histories", JSON.stringify(nextHistories));
  };

  const deleteAllHistories = () => {
    if (!confirm("会議履歴をすべて削除しますか？")) return;
    setHistories([]);
    localStorage.removeItem("meeting_histories");
  };

  const makeCopyText = (copyTheme, copyLogs, copyFinalResult = "") => {
    return [
      "【会議テーマ】",
      copyTheme,
      "",
      copyFinalResult ? "【最終結果】" : "",
      copyFinalResult,
      "",
      "【会議ログ】",
      ...copyLogs.map((log) => `【${log.role}】\n${log.text}\n`),
    ].join("\n");
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("コピーしました。");
    } catch {
      alert("コピーに失敗しました。");
    }
  };

  const copyResult = () => {
    if (logs.length === 0) {
      alert("コピーする会議結果がありません。");
      return;
    }

    copyText(makeCopyText(theme, logs, finalResult));
  };

  const copyFinalOnly = () => {
    if (!finalResult) {
      alert("コピーする最終結果がありません。");
      return;
    }

    copyText(`【会議テーマ】\n${theme}\n\n【最終結果】\n${finalResult}`);
  };

  const copyHistory = (history) => {
    copyText(makeCopyText(history.theme, history.logs, history.finalResult || ""));
  };

  const escapeHtml = (text) => {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const savePdf = () => {
    if (logs.length === 0) {
      alert("PDF保存する会議結果がありません。");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("PDF保存画面を開けませんでした。ポップアップ許可を確認してください。");
      return;
    }

    const logHtml = logs
      .map(
        (log) => `
          <section class="log-section">
            <h2>${escapeHtml(log.role)}</h2>
            <p>${escapeHtml(log.text).replace(/\n/g, "<br />")}</p>
          </section>
        `
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="ja">
        <head>
          <meta charset="UTF-8" />
          <title>AI会議メーカー PDF</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              line-height: 1.8;
              color: #222;
              padding: 32px;
            }
            h1 {
              font-size: 26px;
              margin-bottom: 8px;
            }
            .date {
              color: #666;
              margin-bottom: 28px;
            }
            .theme,
            .final,
            .log-section {
              border: 1px solid #ddd;
              border-radius: 12px;
              padding: 18px;
              margin-bottom: 18px;
            }
            .final {
              background: #fffaf0;
            }
            h2 {
              font-size: 18px;
              margin: 0 0 10px;
            }
            p {
              white-space: normal;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <h1>AI会議メーカー</h1>
          <div class="date">${escapeHtml(new Date().toLocaleString("ja-JP"))}</div>

          <section class="theme">
            <h2>会議テーマ</h2>
            <p>${escapeHtml(theme).replace(/\n/g, "<br />")}</p>
          </section>

          ${
            finalResult
              ? `
                <section class="final">
                  <h2>最終結果</h2>
                  <p>${escapeHtml(finalResult).replace(/\n/g, "<br />")}</p>
                </section>
              `
              : ""
          }

          ${logHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("このブラウザは音声入力に対応していません。Chromeで試してください。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let finalText = "";

      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }

      const text = finalText || event.results[event.results.length - 1][0].transcript;
      setTheme(text.trim().slice(0, maxLength));
    };

    recognition.onerror = () => {
      alert("音声入力に失敗しました。もう一度押してください。");
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const startMeeting = async () => {
    const savedApiKey = localStorage.getItem("openai_api_key") || apiKey;

    if (!savedApiKey.trim()) {
      alert("OpenAI APIキーを入力して保存してください。");
      return;
    }

    if (!theme.trim()) {
      alert("会議テーマを入力してください。");
      return;
    }

    setIsMeeting(true);
    setErrorMessage("");
    setLogs([]);
    setFinalResult("");
    setOpenLogIds([]);
    setCurrentSpeaker("");

    const newLogs = [];
    let latestFinalResult = "";

    try {
      const response = await fetch("/api/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, apiKey: savedApiKey.trim() }),
      });

      if (!response.ok || !response.body) {
        throw new Error("AI会議の生成に失敗しました。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;

          const data = JSON.parse(line);

          if (data.type === "status") {
            setCurrentSpeaker(data.role);
          }

          if (data.type === "log") {
            const log = {
              id: newLogs.length + 1,
              role: data.role,
              text: data.text,
              className: getMemberClassName(data.role),
            };

            newLogs.push(log);
            setLogs([...newLogs]);
            setOpenLogIds([log.id]);

            if (data.role === "編集長") {
              latestFinalResult = data.text;
              setFinalResult(data.text);
            }
          }

          if (data.type === "final_result") {
            latestFinalResult = data.text;
            setFinalResult(data.text);
          }

          if (data.type === "error") {
            throw new Error(data.message);
          }

          if (data.type === "done") {
            setCurrentSpeaker("");
            setOpenLogIds(newLogs.map((log) => log.id));
            saveMeetingHistory(theme, newLogs, latestFinalResult);
          }
        }
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "AI会議の生成に失敗しました。APIキーが正しいか確認してください。"
      );
    } finally {
      setIsMeeting(false);
      setCurrentSpeaker("");
    }
  };

  return (
    <div className="app">
      <div className="bg-icon bg-people">👥</div>
      <div className="bg-icon bg-chat">💬</div>

      <header className="hero">
        <h1>AI会議メーカー</h1>
        <p>複数のAIが議論し、過程と最終結論の両方を出します</p>
      </header>

      <main className="container">
        <section className="theme-card">
          <h2><span>🔑</span> OpenAI APIキー</h2>

          {isApiKeyEditing ? (
            <>
              <div className="textarea-wrap">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk- から始まるOpenAI APIキーを入力"
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid #ddd",
                    fontSize: "16px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div className="action-area">
                <button className="voice-button" onClick={saveApiKey} disabled={isMeeting}>
                  <span className="button-icon">💾</span>
                  <span><strong>保存</strong><small>この端末に保存</small></span>
                </button>

                <button className="voice-button" onClick={deleteApiKey} disabled={isMeeting}>
                  <span className="button-icon">🗑</span>
                  <span><strong>削除</strong><small>保存キーを消す</small></span>
                </button>
              </div>

              <p className="privacy">
                {isApiKeySaved ? "✅ APIキー保存済み" : "⚠️ APIキー未保存"}
              </p>
            </>
          ) : (
            <>
              <p className="privacy" style={{ fontSize: "16px", marginTop: "18px" }}>
                ✅ APIキー保存済み
              </p>

              <div className="action-area">
                <button className="voice-button" onClick={() => setIsApiKeyEditing(true)} disabled={isMeeting}>
                  <span className="button-icon">✏️</span>
                  <span><strong>変更</strong><small>別のAPIキーを使う</small></span>
                </button>

                <button className="voice-button" onClick={deleteApiKey} disabled={isMeeting}>
                  <span className="button-icon">🗑</span>
                  <span><strong>削除</strong><small>保存キーを消す</small></span>
                </button>
              </div>
            </>
          )}
        </section>

        <section className="theme-card">
          <h2><span>📕</span> 会議テーマを入力してください</h2>

          <div className="textarea-wrap">
            <textarea
              value={theme}
              maxLength={maxLength}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="例：AIのハルシネーション問題についてnote記事を作りたい"
            />
            <div className="counter">{theme.length} / {maxLength}</div>
          </div>

          <div className="action-area">
            <button
              className={`voice-button ${isListening ? "listening" : ""}`}
              onClick={handleVoiceInput}
              disabled={isMeeting}
            >
              <span className="button-icon">🎙</span>
              <span>
                <strong>{isListening ? "聞き取り中" : "音声入力"}</strong>
                <small>話してテーマを入力</small>
              </span>
            </button>

            <button className="start-button" onClick={startMeeting} disabled={isMeeting}>
              <span className="play-icon">{isMeeting ? "…" : "▶"}</span>
              <span>
                <strong>{isMeeting ? "会議中..." : "会議開始"}</strong>
                <small>{isMeeting ? "AIが順番に発言中" : "AI円卓会議をスタート"}</small>
              </span>
            </button>
          </div>

          {currentSpeaker && <p className="speaking-message">{currentSpeaker} が発言中...</p>}
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </section>

        {finalResult && (
          <section className="log-card">
            <h2>⭐ 最終結果</h2>

            <div className="action-area">
              <button className="start-button" onClick={copyFinalOnly}>
                <span className="play-icon">📋</span>
                <span><strong>最終結果だけコピー</strong><small>記事・企画に使う</small></span>
              </button>
            </div>

            <div className="log-item editor">
              <p style={{ whiteSpace: "pre-wrap" }}>{finalResult}</p>
            </div>
          </section>
        )}

        <section className="flow-card">
          <h2><span>👥</span> AI会議の流れ</h2>

          <div className="flow-list">
            {members.map((member, index) => (
              <div className="flow-item-wrap" key={member.role}>
                <div className={`flow-item ${member.className}`}>
                  <div className="flow-icon">{member.icon}</div>
                  <div>
                    <strong>{member.role}</strong>
                    <small>{member.desc}</small>
                  </div>
                </div>
                {index < members.length - 1 && <div className="arrow">→</div>}
              </div>
            ))}
          </div>
        </section>

        {(logs.length > 0 || isMeeting) && (
          <section className="log-card">
            <h2>会議ログ</h2>

            {logs.length > 0 && (
              <div className="action-area">
                <button className="start-button" onClick={copyResult}>
                  <span className="play-icon">📋</span>
                  <span><strong>全部コピー</strong><small>最終結果＋会議ログ</small></span>
                </button>

                <button className="start-button" onClick={savePdf}>
                  <span className="play-icon">📄</span>
                  <span><strong>PDF保存</strong><small>会議結果をPDFにする</small></span>
                </button>

                <button className="voice-button" onClick={openAllLogs}>
                  <span className="button-icon">📖</span>
                  <span><strong>全部開く</strong><small>全文を見る</small></span>
                </button>

                <button className="voice-button" onClick={closeAllLogs}>
                  <span className="button-icon">📕</span>
                  <span><strong>全部閉じる</strong><small>見出しだけにする</small></span>
                </button>
              </div>
            )}

            <div className="log-list">
              {logs.map((log) => {
                const isOpen = openLogIds.includes(log.id);

                return (
                  <div className={`log-item ${log.className}`} key={log.id}>
                    <button
                      onClick={() => toggleLog(log.id)}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "15px",
                        color: "inherit",
                      }}
                    >
                      {isOpen ? "▼" : "▶"} {log.role}
                    </button>

                    {isOpen && <p>{log.text}</p>}
                  </div>
                );
              })}

              {currentSpeaker && (
                <div className={`log-item ${getMemberClassName(currentSpeaker)} speaking-card`}>
                  <strong>{currentSpeaker}</strong>
                  <p>発言中...</p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="log-card">
          <h2>会議履歴</h2>

          {histories.length === 0 ? (
            <p className="privacy">まだ保存された会議履歴はありません。</p>
          ) : (
            <>
              <div className="action-area">
                <button className="voice-button" onClick={deleteAllHistories} disabled={isMeeting}>
                  <span className="button-icon">🧹</span>
                  <span><strong>全履歴削除</strong><small>保存履歴を空にする</small></span>
                </button>
              </div>

              <div className="log-list">
                {histories.map((history) => (
                  <div className="log-item" key={history.id}>
                    <strong>📝 {history.theme}</strong>
                    <p>{history.date}</p>

                    <div className="action-area">
                      <button className="voice-button" onClick={() => openHistory(history)} disabled={isMeeting}>
                        <span className="button-icon">📂</span>
                        <span><strong>開く</strong><small>この会議を見る</small></span>
                      </button>

                      <button className="voice-button" onClick={() => copyHistory(history)} disabled={isMeeting}>
                        <span className="button-icon">📋</span>
                        <span><strong>コピー</strong><small>履歴内容をコピー</small></span>
                      </button>

                      <button className="voice-button" onClick={() => deleteHistory(history.id)} disabled={isMeeting}>
                        <span className="button-icon">🗑</span>
                        <span><strong>削除</strong><small>この履歴を消す</small></span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <p className="privacy">🔒 APIキー・会議履歴・入力内容はこの端末内に保存されます</p>
      </main>
    </div>
  );
}

export default App;
