import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import type { TuiPlugin, TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { BuiltinTuiPlugin } from "../builtins"
import { createMemo, createSignal, createEffect, onCleanup, Show } from "solid-js"
import type { Part } from "@opencode-ai/sdk/v2"

const id = "internal:sidebar-context"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))
  const session = createMemo(() => props.api.state.session.get(props.session_id))
  const cost = createMemo(() => session()?.cost ?? 0)
  const status = () => props.api.state.session.status(props.session_id)

  const [now, setNow] = createSignal(Date.now())

  createEffect(() => {
    if (status()?.type !== "busy") return
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 200)
    onCleanup(() => clearInterval(timer))
  })

  const activeMessage = createMemo(() => {
    if (status()?.type !== "busy") return
    const all = msg()
    const last = all[all.length - 1]
    if (last && last.role === "assistant" && typeof last.time.completed !== "number") {
      return last
    }
  })

  const activeStats = createMemo(() => {
    const message = activeMessage()
    if (!message) return

    const parts = props.api.state.part(message.id)
    const toolDurationMs = parts.reduce((sum, p) => {
      if (p.type === "tool" && p.state && "time" in p.state && p.state.time) {
        const time = p.state.time
        const start = time.start
        const end = "end" in time ? (time.end ?? now()) : now()
        if (start && end && end > start) {
          return sum + (end - start)
        }
      }
      return sum
    }, 0)

    const activeDurationMs = Math.max(100, now() - message.time.created - toolDurationMs)

    return {
      elapsed: Math.max(0, Math.round(activeDurationMs / 1000)),
      cps:
        parts.reduce((sum, p) => {
          if ((p.type === "text" || p.type === "reasoning") && typeof p.text === "string") {
            return sum + p.text.length
          }
          return sum
        }, 0) / (activeDurationMs / 1000),
    }
  })

  const state = createMemo(() => {
    const assistants = msg().filter((item): item is AssistantMessage => item.role === "assistant")
    const totalCacheRead = assistants.reduce((sum, item) => sum + (item.tokens.cache?.read ?? 0), 0)
    const sumInput = assistants.reduce((sum, item) => sum + (item.tokens.input ?? 0), 0) + totalCacheRead
    const cacheHitRate = sumInput > 0 ? (totalCacheRead / sumInput) * 100 : null

    const last = assistants.findLast((item) => item.tokens.output > 0)
    if (!last) {
      return {
        tokens: 0,
        percent: null,
        cacheHitRate,
      }
    }

    const tokens =
      last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    const model = props.api.state.provider.find((item) => item.id === last.providerID)?.models[last.modelID]

    return {
      tokens,
      percent: model?.limit.context ? Math.round((tokens / model.limit.context) * 100) : null,
      cacheHitRate,
    }
  })

  return (
    <box>
      <text fg={theme().text}>
        <b>Context</b>
      </text>
      <text fg={theme().textMuted}>{state().tokens.toLocaleString()} tokens</text>
      <text fg={theme().textMuted}>{state().percent ?? 0}% used</text>
      <text fg={theme().textMuted}>{money.format(cost())} spent</text>
      <Show when={state().cacheHitRate !== null}>
        <text fg={theme().textMuted}>{(state().cacheHitRate ?? 0).toFixed(1)}% cache hit</text>
      </Show>
      <Show when={activeStats()}>
        {(stats) => (
          <text fg={theme().info}>
            {stats().elapsed}s • {stats().cps.toFixed(1)} c/s
          </text>
        )}
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 100,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: BuiltinTuiPlugin = {
  id,
  tui,
}

export default plugin
