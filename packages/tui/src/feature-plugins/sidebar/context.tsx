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
    const elapsedMs = now() - message.time.created
    const elapsedSec = Math.max(0, Math.round(elapsedMs / 1000))

    const parts = props.api.state.part(message.id)
    let charCount = 0
    for (const p of parts) {
      if (p.type === "text" && typeof p.text === "string") {
        charCount += p.text.length
      } else if (p.type === "reasoning" && typeof p.text === "string") {
        charCount += p.text.length
      } else if (p.type === "tool" && p.state?.input) {
        charCount += JSON.stringify(p.state.input).length
      }
    }
    const estimated = Math.ceil(charCount / 3.5)
    const actual = (message.tokens.output ?? 0) + (message.tokens.reasoning ?? 0)
    const tokens = Math.max(actual, estimated)
    const tps = tokens > 0 ? tokens / Math.max(0.1, elapsedMs / 1000) : 0

    return {
      elapsed: elapsedSec,
      tps: tps,
    }
  })

  const state = createMemo(() => {
    const last = msg().findLast((item): item is AssistantMessage => item.role === "assistant" && item.tokens.output > 0)
    if (!last) {
      return {
        tokens: 0,
        percent: null,
      }
    }

    const tokens =
      last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    const model = props.api.state.provider.find((item) => item.id === last.providerID)?.models[last.modelID]
    return {
      tokens,
      percent: model?.limit.context ? Math.round((tokens / model.limit.context) * 100) : null,
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
      <Show when={activeStats()}>
        {(stats) => (
          <text fg={theme().info}>
            {stats().elapsed}s • {stats().tps.toFixed(1)} t/s
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
