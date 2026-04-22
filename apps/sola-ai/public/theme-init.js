try {
  var t = JSON.parse(localStorage.getItem('sola-ai-theme') || '{}')
  var m = (t.state && t.state.mode) || 'dark'
  var th = (t.state && t.state.theme) || 'default'
  if (typeof m !== 'string' || !/^[a-z-]{1,32}$/i.test(m)) m = 'dark'
  if (typeof th !== 'string' || !/^[a-z-]{1,32}$/i.test(th)) th = 'default'
  document.documentElement.className = m + (th !== 'default' ? ' ' + th : '')
} catch (e) {
  document.documentElement.className = 'dark'
}
