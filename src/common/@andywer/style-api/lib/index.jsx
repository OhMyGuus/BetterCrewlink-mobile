import React, { createContext, useState } from "react"

export const CssInJsContext = createContext()

export function CssInJsProvider (props) {
  const [state] = useState({
    createSheet: props.createSheet
  })
  return (
    <CssInJsContext.Provider value={state}>
      {props.children}
    </CssInJsContext.Provider>
  )
}