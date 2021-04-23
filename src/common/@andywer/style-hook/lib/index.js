import { CssInJsContext } from "@andywer/style-api"
import { useContext, useMemo, useMutationEffect, useState } from "react"
import { ThemeContext } from "theming"

export { ThemeContext }

function useStylesInternal (styles, inputs) {
  const cssInJs = useContext(CssInJsContext)
  const theme = useContext(ThemeContext) || {}

  if (!cssInJs) {
    throw new Error("No CSS-in-JS implementation found in context.")
  }
  if (!theme._id) {
    // Hacky! Just give every theme we see an ID, so we can tell them apart easily
    theme._id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  }

  const [sheet] = useState(() => cssInJs.createSheet(styles, theme._id, theme, inputs))

  useMutationEffect(() => {
    sheet.attach()
    return () => sheet.detach()
  }, [])

  // Misusing useMemo here to synchronously sheet.update() only if styles or theme changed
  useMemo(() => {
    if (sheet.attached) {
      sheet.update(styles, theme)
    }
  }, inputs ? [theme, ...inputs] : [theme, Math.random()])

  return sheet.getClassNames()
}

function transformIntoGlobalStyles (styles) {
  const transformed = {}

  for (const key of Object.keys(styles)) {
    transformed[`@global ${key}`] = styles[key]
  }

  return transformed
}

function wrapStyleCallback (styleCallback, transformStyles) {
  // Don't just pass-through arbitrary arguments, since we check function.length in useStyles()
  if (styleCallback.length === 0) {
    return () => transformStyles(styleCallback())
  } else if (styleCallback.length === 1) {
    return (theme) => transformStyles(styleCallback(theme))
  } else if (styleCallback.length === 2) {
    return (theme, props) => transformStyles(styleCallback(theme, props))
  } else {
    return (...args) => transformStyles(styleCallback(...args))
  }
}

export function useStyles (styles, inputs = undefined) {
  return useStylesInternal(styles, inputs)
}

export function useStyle (style, inputs = undefined) {
  return useStylesInternal({ style }, inputs).style
}

export function useGlobalStyles (styles, inputs = undefined) {
  const transformedStyles = transformIntoGlobalStyles(styles)
  useStylesInternal(transformedStyles, inputs)
}