// pages/api/tiktok-audio.js
const fetch = require('node-fetch')

export default async function handler(req, res) {
  const { url } = req.query
  const SCRAPEAPI_KEY = process.env.SCRAPEAPI_KEY

  if (!url || !url.includes('tiktok.com')) {
    return res.status(400).json({ error: 'Invalid TikTok URL' })
  }

  if (!SCRAPEAPI_KEY) {
    return res.status(500).json({ error: 'ScrapeAPI key not set' })
  }

  try {
    // Use ScrapeAPI with JS rendering for better extraction (TikTok needs it now)
    const proxyUrl = `http://api.scrapeapi.com/?api_key=${SCRAPEAPI_KEY}&url=${encodeURIComponent(url)}&render=true&wait=3000`
    const response = await fetch(proxyUrl)
    
    if (!response.ok) {
      throw new Error(`ScrapeAPI failed: ${response.status}`)
    }
    
    const html = await response.text()

    // Updated regex for 2025 TikTok structure - looks for __UNIVERSAL_DATA_FOR_REHYDRATION__ or direct music object
    let musicMatch
    // Try the full hydration data first (more reliable)
    const hydrationMatch = html.match(/__UNIVERSAL_DATA_FOR_REHYDRATION__.*?({.+})<\/script>/s)
    if (hydrationMatch) {
      try {
        const hydrationData = JSON.parse(hydrationMatch[1])
        // Dig into the object for music (structure: __DEFAULT_SCOPE__['webapp.video-detail']?.itemInfo?.itemStruct?.music)
        const videoData = hydrationData.__DEFAULT_SCOPE__?.['webapp.video-detail'] || {}
        const music = videoData.itemInfo?.itemStruct?.music || {}
        if (music.playUrl) {
          musicMatch = { 1: JSON.stringify(music) } // Fake match for below
        }
      } catch (e) {
        console.log('Hydration parse failed, trying direct music')
      }
    }
    
    // Fallback: Direct music object in script (older but still works sometimes)
    if (!musicMatch) {
      musicMatch = html.match(/"music":\s*({.+?})(?=\s*[,}])/s)
    }
    
    if (!musicMatch) {
      // Last resort: Broader search for playUrl
      const playUrlMatch = html.match(/"playUrl":\s*"([^"]+\.mp3[^"]*)"/)
      if (playUrlMatch) {
        return res.json({
          success: true,
          title: 'tiktok_sound',
          author: 'unknown',
          audioUrl: playUrlMatch[1],
          downloadUrl: `/api/download?audio=${encodeURIComponent(playUrlMatch[1])}&name=tiktok_audio`
        })
      }
      return res.status(404).json({ error: 'No audio found (video might be private or structure changed)' })
    }

    const music = JSON.parse(musicMatch[1])
    const audioUrl = music.playUrl || music.playUrlList?.[0] || music.musicUrl
    const title = (music.title || 'tiktok_audio').replace(/[^\w\s-]/g, '').substring(0, 50)
    const author = music.authorName || music.author || 'unknown'

    if (!audioUrl) return res.status(404).json({ error: 'Audio URL missing' })

    res.json({
      success: true,
      title,
      author,
      audioUrl,
      downloadUrl: `/api/download?audio=${encodeURIComponent(audioUrl)}&name=${encodeURIComponent(title)}`
    })

  } catch (error) {
    console.error('Full error:', error) // Logs to Vercel for debugging
    res.status(500).json({ error: 'Scraping failed', details: error.message })
  }
}
