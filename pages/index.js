// pages/index.js
export default function Home() {
  return (
    <div style={{
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
      padding: 50,
      background: "#000",
      color: "#fff",
      minHeight: "100vh"
    }}>
      <h1 style={{ fontSize: 42 }}>TikTok Audio Downloader</h1>
      <p>Paste any TikTok video link → get the original sound as MP3</p>

      <input
        id="url"
        placeholder="https://www.tiktok.com/@user/video/123456789"
        style={{
          width: "90%",
          maxWidth: 600,
          padding: 16,
          fontSize: 18,
          margin: "20px auto",
          display: "block"
        }}
      />

      <button onClick={extract} style={{
        padding: "16px 40px",
        fontSize: 20,
        background: "#fe2c55",
        color: "white",
        border: "none",
        borderRadius: 8,
        cursor: "pointer"
      }}>
        Extract Audio
      </button>

      <div id="result" style={{ marginTop: 40 }} />
    </div>
  )
}

async function extract() {
  const url = document.getElementById("url").value.trim()
  if (!url) return alert("Please paste a TikTok link")

  const res = await fetch(`/api/tiktok-audio?url=${encodeURIComponent(url)}`)
  const data = await res.json()

  if (!data.success) {
    document.getElementById("result").innerHTML = `<p style="color:#ff5555">Error: ${data.error}</p>`
    return
  }

  document.getElementById("result").innerHTML = `
    <h2>${data.title}</h2>
    <p>by ${data.author}</p>
    <audio controls src="${data.audioUrl}" style="width:90%; max-width:500px; margin:20px 0"></audio><br/>
    <a href="${data.downloadUrl}" download style="
      display:inline-block;
      background:#fe2c55;
      color:white;
      padding:15px 30px;
      text-decoration:none;
      font-size:18px;
      border-radius:8px;
      margin-top:10px;
    ">
      Download MP3
    </a>
  `
}
