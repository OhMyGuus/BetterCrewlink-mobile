import { CssInJsProvider } from "@andywer/style-api"
import { create, SheetsManager, SheetsRegistry } from "jss"
import defaultPreset from "jss-preset-default"
import React, { useState } from "react"
import { getStaticStyles, isStaticStylesOnly, resolveStyles } from "./style-utils"

export { SheetsRegistry }

/**
 * Depending on the style hook's `inputs` argument (2nd argument), create a key
 * for the sheet, so that other useStyles() hook invocations working with the
 * same styles and updating in the same situations, share a key.
 *
 * That approach ensures that we can safely mutate the stylesheets.
 */
function createSheetMeta (styles, themeID, inputs) {
  const randomSheetID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)

  if (Array.isArray(inputs) && inputs.length === 0) {
    if (isStaticStylesOnly(styles)) {
      // No function rules, no reaction to prop changes: Use stringified styles as key
      return {
        key: JSON.stringify(styles),
        isStatic: true
      }
    } else {
      // Function rules, but no reaction to prop changes:
      // Return a key that is the same for all similarly-styled React elements that use the same theme
      return {
        key: JSON.stringify(themeID) + ":" + JSON.stringify(getStaticStyles(styles)),
        isStatic: false
      }
    }
  } else {
    // Update styles on some specific or every prop changes:
    // Return always-unique key, since prop changes are unique to every React element
    return {
      key: randomSheetID,
      isStatic: false
    }
  }
}

function mutateJssSheet (jssSheet, updatedStyles) {
  const prevClassNames = Object.keys(jssSheet.classes)

  // TODO: Update only the rules that changed

  for (const prevClassName of prevClassNames) {
    jssSheet.deleteRule(prevClassName)
  }

  jssSheet.addRules(updatedStyles)
}

function createUnifiedSheet (meta, jss, manager, registry, styles, theme, jssSheetOptions) {
  const resolvedStyles = resolveStyles(styles, theme)
  const jssSheet = manager.get(meta.key) || jss.createStyleSheet(resolvedStyles, jssSheetOptions || {})
  const latestStylesFingerprint = JSON.stringify(resolvedStyles)

  manager.add(meta.key, jssSheet)

  if (registry) {
    registry.add(jssSheet)
  }

  const sheet = {
    attached: false,
    latestStylesFingerprint,
    meta,

    attach () {
      manager.manage(meta.key)
      sheet.attached = true
    },
    detach () {
      manager.unmanage(meta.key)
      sheet.attached = false
    },
    getClassNames () {
      return jssSheet.classes
    },
    toString () {
      return jssSheet.toString()
    },
    update (currentStyles, currentTheme) {
      // TODO: Only when in development:
      //       Warn if getStaticStyles(currentStyles) does not match getStaticStyles(styles)

      if (sheet.meta.isStatic) return

      const updatedResolvedStyles = resolveStyles(currentStyles, currentTheme)
      const updatedStylesFingerprint = JSON.stringify(updatedResolvedStyles)

      if (updatedStylesFingerprint === sheet.latestStylesFingerprint) return

      mutateJssSheet(jssSheet, updatedResolvedStyles)
      sheet.latestStylesFingerprint = updatedStylesFingerprint
    }
  }
  return sheet
}

export function JssProvider (props) {
  const [{ jss, manager }] = useState({
    jss: create(defaultPreset()),
    manager: new SheetsManager()
  })

  const createSheet = (styles, themeID, theme, inputs) => {
    const sheetMeta = createSheetMeta(styles, themeID, inputs)
    return createUnifiedSheet(sheetMeta, jss, manager, props.registry, styles, theme, props.sheetOptions || {})
  }

  return (
    <CssInJsProvider createSheet={createSheet}>
      {props.children}
    </CssInJsProvider>
  )
}