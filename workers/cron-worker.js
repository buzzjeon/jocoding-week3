export default {
  async scheduled(_event, env, _ctx) {
    const res = await fetch(`${env.PAGES_BASE_URL}/api/run-daily`, {
      method: 'POST',
      headers: {
        'X-Admin-Token': env.DAILY_RECOMMEND_SECRET,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Cron failed: ${res.status} ${text}`)
    }
  },
}
