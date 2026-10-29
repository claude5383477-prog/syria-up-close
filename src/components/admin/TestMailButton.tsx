'use client'

import { useState } from 'react'

/** "Send a test e-mail" on the notification settings (batch 4). Save the addresses first. */
export function TestMailButton() {
  const [state, setState] = useState<'' | 'busy' | string>('')
  const send = async () => {
    setState('busy')
    const res = await fetch('/api/globals/notificationSettings/test', { method: 'POST', credentials: 'include' })
    const body = (await res.json().catch(() => ({}))) as { sent?: number; error?: string }
    setState(res.ok ? `انبعت إيميل تجريبي لـ ${body.sent} عناوين.` : body.error === 'no-emails' ? 'أضف إيميل واحد على الأقل واحفظ أولاً.' : 'ما انبعت الإيميل: تأكد من إعدادات الإيميل (RESEND_API_KEY أو SMTP).')
  }
  return (
    <div style={{ margin: '8px 0 24px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className="btn btn--style-secondary btn--size-medium" onClick={send} disabled={state === 'busy'}>
        ابعت إيميل تجريبي
      </button>
      {state && state !== 'busy' && <span role="status">{state}</span>}
    </div>
  )
}
