export function getStaticStyles (styles) {
    const statics = {}
  
    for (const key of Object.keys(styles)) {
      const value = styles[key]
      if (typeof value === "object" && value) {
        statics[key] = getStaticStyles(value)
      } else if (typeof value !== "function") {
        statics[key] = value
      }
    }
  
    return statics
  }
  
  export function isStaticStylesOnly (styles) {
    for (const key of Object.keys(styles)) {
      const value = styles[key]
      if (typeof value === "object" && value) {
        if (!isStaticStylesOnly(value)) return false
      } else if (typeof value === "function") {
        return false
      }
    }
    return true
  }
  
  export function resolveStyles (styles, theme) {
    const resolved = {}
  
    for (const key of Object.keys(styles)) {
      const value = styles[key]
      if (typeof value === "object" && value) {
        resolved[key] = resolveStyles(value, theme)
      } else if (typeof value === "function") {
        resolved[key] = value(theme)
      } else {
        resolved[key] = value
      }
    }
  
    return resolved
  }