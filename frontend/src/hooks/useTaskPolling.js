import { useEffect, useRef, useState } from "react"
import { getTask } from "../services/api"

export const TERMINAL_STATES = ["SUCCESS", "FAILURE", "REVOKED"]

export const ACTIVE_STATES = ["PENDING", "STARTED", "RETRY", "PROCESSING"]

/** Poll GET /tasks/{taskId} every `interval` ms until a terminal state arrives.
 *  Bounded by MAX_ATTEMPTS so a stuck backend can never cause an infinite loop. */
export function useTaskPolling(taskId, { interval = 2000, onUpdate } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    if (!taskId) return undefined

    let cancelled = false
    let timerId = null
    let attempts = 0
    const MAX_ATTEMPTS = 300 // 2s * 300 = 10 minutes max

    const stop = () => {
      if (timerId) {
        clearTimeout(timerId)
        timerId = null
      }
    }

    const tick = async () => {
      if (cancelled) return
      attempts += 1
      try {
        const res = await getTask(taskId)
        if (cancelled) return
        setData(res)
        setError(null)
        onUpdateRef.current?.(res)
        // Terminal state or attempt budget exhausted → stop polling.
        if (TERMINAL_STATES.includes(res.state) || attempts >= MAX_ATTEMPTS) {
          return
        }
      } catch (err) {
        if (cancelled) return
        setError(err)
        if (attempts >= MAX_ATTEMPTS) return
      }
      timerId = setTimeout(tick, interval)
    }

    tick()

    return () => {
      cancelled = true
      stop()
    }
  }, [taskId, interval])

  return { data, error }
}