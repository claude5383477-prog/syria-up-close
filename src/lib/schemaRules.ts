// Content rule ق4: no price fields and no safety claims anywhere in the data model.
const FORBIDDEN = new Set(['price', 'prices', 'cost', 'costs', 'fee', 'fees', 'safe', 'safety', 'secure', 'security'])

type AnyField = {
  name?: string
  fields?: AnyField[]
  tabs?: { fields?: AnyField[] }[]
  blocks?: { fields?: AnyField[] }[]
}

const tokens = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .map((t) => t.toLowerCase())

/** Names of fields (at any nesting depth) containing a forbidden word as a whole token. */
export function forbiddenFieldNames(fields: readonly unknown[]): string[] {
  const out: string[] = []
  const walk = (list: readonly AnyField[]) => {
    for (const f of list) {
      if (f.name && tokens(f.name).some((t) => FORBIDDEN.has(t))) out.push(f.name)
      if (f.fields) walk(f.fields)
      for (const tab of f.tabs ?? []) walk(tab.fields ?? [])
      for (const block of f.blocks ?? []) walk(block.fields ?? [])
    }
  }
  walk(fields as AnyField[])
  return out
}
