// pages/api/download.js
const fetch = require('node-fetch')

export default async function handler(req, res) {
  const { audio, name = 'tiktok_audio' } = req.query

  if (!audio) return res.status(400).send('Missing audio URL')

  try {
    const response = await fetch(audio)
    if (!response.ok) throw new Error('Failed to fetch audio')

    const buffer = await response.buffer()

    res.setHeader('Content-Disposition', `attachment; filename="${name.replace(/[^a-z0-9]/gi, '_')}.mp3"`)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(buffer)
  } catch (err) {
    res.status(500).send('Download failed')
  }
}
