// pages/api/tiktok-audio.js
const fetch = require('node-fetch')

const SCRAPEAPI_KEY = process.env.SCRAPEAPI_KEY

export default async function handler(req, res) {
  const { url } = req.query

  if (!url || !url.includes('tiktok.com')) {
    return res.status(400).json({ error: 'Invalid TikTok URL' })
  }

  if (!SCRAPEAPI_KEY) {
    return res.status(500).json({ error: 'ScrapeAPI key missing' })
  }

  try {
    const proxyUrl = `http://api.scrapeapi.com/?api_key=${SCRAPEAPI_KEY}&url=${encodeURIComponent(url)}&render=false`
    const response = await fetch(proxyUrl)
    const html = await response.text()

    // Extract music JSON from TikTok's page
    const musicMatch = html.match(/"music":\s*({.+?})(,"awemeId"|})/)
    if (!musicMatch) return res.status(404).json({ error: 'No audio found (private video?)' })

    const musicJson = JSON.parse(musicMatch[1])
    const audioUrl = musicJson.playUrl || musicJson.playUrlList?.[0]
    const title = musicJson.title || 'tiktok_sound'
    const author = musicJson.author || 'unknown'

    if (!audioUrl) return res.status(404).json({ error: 'Audio URL not found' })

    res.json({
      success: true,
      title,
      author,
      audioUrl,
      downloadUrl: `/api/download?audio=${encodeURIComponent(audioUrl)}&name=${encodeURIComponent(title)}`
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Scraping failed', details: err.message })
  }
}
