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
    // Enhanced ScrapeAPI call: JS render + US proxy + wait for load
    const proxyUrl = `http://api.scrapeapi.com/?api_key=${SCRAPEAPI_KEY}&url=${encodeURIComponent(url)}&render=true&country_code=us&wait=5000&ultra=true`
    const response = await fetch(proxyUrl, { timeout: 30000 })
    
    if (!response.ok) {
      throw new Error(`ScrapeAPI HTTP ${response.status}: ${await response.text()}`)
    }
    
    let html = await response.text()
    console.log('HTML length:', html.length) // Log for debugging in Vercel

    // Method 1: Extract from __UNIVERSAL_DATA_FOR_REHYDRATION__ (primary, most reliable)
    let music = null
    const hydrationMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">({.+})<\/script>/s)
    if (hydrationMatch) {
      try {
        const hydrationData = JSON.parse(hydrationMatch[1])
        const videoDetail = hydrationData.__DEFAULT_SCOPE__?.['webapp.video-detail'] || {}
        music = videoDetail.itemInfo?.itemStruct?.music || videoDetail.musicInfo || {}
        console.log('Hydration music found:', !!music.playUrl)
      } catch (e) {
        console.log('Hydration parse error:', e.message)
      }
    }

    // Method 2: Direct "music" object in inline scripts
    if (!music || !music.playUrl) {
      const directMatch = html.match(/"music":\s*({[\s\S]+?})(?=\s*[},])/s)
      if (directMatch) {
        try {
          music = JSON.parse(directMatch[1])
          console.log('Direct music found:', !!music.playUrl)
        } catch (e) {
          console.log('Direct parse error:', e.message)
        }
      }
    }

    // Method 3: Fallback - grep for playUrl directly (for edge cases)
    if (!music || !music.playUrl) {
      const playUrlMatch = html.match(/"playUrl":\s*"([^"]+\.mp3[^"]*)"/) || html.match(/"musicUrl":\s*"([^"]+\.mp3[^"]*)"/)
      if (playUrlMatch) {
        music = { playUrl: playUrlMatch[1], title: 'tiktok_sound', author: 'unknown' }
        console.log('Fallback playUrl found:', music.playUrl)
      }
    }

    if (!music || !music.playUrl) {
      console.log('No music data found in HTML sample:', html.substring(0, 500)) // Log snippet for debug
      return res.status(404).json({ error: 'No audio found. Try a different video or check Vercel logs.' })
    }

    const audioUrl = music.playUrl.startsWith('http') ? music.playUrl : `https:${music.playUrl}`
    const title = (music.title || 'tiktok_audio').replace(/[^\w\s-]/g, '').substring(0, 50)
    const author = music.authorName || music.author || music.musicName || 'unknown'

    res.json({
      success: true,
      title,
      author,
      audioUrl,
      downloadUrl: `/api/download?audio=${encodeURIComponent(audioUrl)}&name=${encodeURIComponent(title)}`
    })

  } catch (error) {
    console.error('Full scrape error:', error.message, error.stack)
    res.status(500).json({ error: 'Scraping failed', details: error.message })
  }
}
