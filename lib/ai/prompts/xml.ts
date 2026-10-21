// Injected content reaches the model inside XML-ish tags the prompts explain. Escaping keeps text that looks like
// a tag (a learner's `</doc>`, code with `<T>`) from closing or opening one.

export function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** `<name a="1">body</name>`, with the attributes and body escaped; attributes that are false or undefined are left out. */
export function tag(name: string, attrs: Record<string, string | number | boolean | undefined>, body: string) {
  const attributes = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => ` ${k}="${escape(String(v))}"`)
    .join('')
  return `<${name}${attributes}>\n${escape(body)}\n</${name}>`
}
