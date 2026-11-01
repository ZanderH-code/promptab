import { useEffect, useState, type MouseEvent } from 'react'
import type { Settings } from '../core/model'

type Props = {
  language: Settings['language']
  showClock: boolean
  showDate: boolean
  hour12: boolean
  onContextMenu: (event: MouseEvent) => void
}

export function Clock({ language, showClock, showDate, hour12, onContextMenu }: Props) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="intro mnt-widget" data-widget="clock" onContextMenu={onContextMenu}>
      <div className="eyebrow"><span className="dot" /> YOUR SPACE, YOUR PACE</div>
      {showClock && <div className="clock mnt-clock">{now.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12 })}</div>}
      {showDate && <div className="date mnt-date">{now.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>}
    </div>
  )
}
