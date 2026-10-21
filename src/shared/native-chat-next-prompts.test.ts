import { describe, expect, it } from 'vitest'
import type { NativeChatMessage } from './native-chat-types'
import { latestNativeChatNextPrompts, parseNativeChatNextPrompts } from './native-chat-next-prompts'

const reply = '完成。\n\n```orca-next-prompts\n["复核改动", "补充使用说明"]\n```'
const message: NativeChatMessage = {
  id: 'answer',
  role: 'assistant',
  state: 'completed',
  source: 'transcript',
  timestamp: 1,
  blocks: [{ type: 'text', text: reply }]
}

describe('native chat next prompts', () => {
  it('extracts and deduplicates only a complete trailing protocol block', () => {
    expect(parseNativeChatNextPrompts(reply)).toEqual({
      text: '完成。',
      prompts: ['复核改动', '补充使用说明']
    })
    expect(
      parseNativeChatNextPrompts('```orca-next-prompts\n["检查", "检查"]\n```').prompts
    ).toEqual(['检查'])
  })

  it.each([
    `${reply}\nMore explanation`,
    `\`\`\`\`markdown\n${reply}\n\`\`\`\``,
    '```orca-next-prompts\n["incomplete"]',
    '```orca-next-prompts\nnot json\n```',
    '```orca-next-prompts\n["a","b","c","d"]\n```',
    '```orca-next-prompts\n["a",123]\n```',
    '```orca-next-prompts\n["line\\nbreak"]\n```',
    `\`\`\`orca-next-prompts\n["${'a'.repeat(501)}"]\n\`\`\``,
    '```orca-next-prompts\n[]\n```'
  ])('preserves ordinary, nested, incomplete or invalid content: %s', (text) => {
    expect(parseNativeChatNextPrompts(text)).toEqual({ text, prompts: [] })
  })

  it('does not revive a suggestion after another message, or accept subagent and partial rows', () => {
    expect(latestNativeChatNextPrompts([message])).toEqual(['复核改动', '补充使用说明'])
    for (const patch of [
      { role: 'user' as const },
      { role: 'tool' as const },
      { role: 'system' as const },
      { state: 'running' as const },
      { state: undefined },
      { agentId: 'child' },
      { shortened: true as const },
      { queued: true as const }
    ]) {
      expect(latestNativeChatNextPrompts([message, { ...message, ...patch }])).toEqual([])
    }
    expect(latestNativeChatNextPrompts([])).toEqual([])
  })
})
