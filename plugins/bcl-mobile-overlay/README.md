# bcl-mobile-overlay

overlay for bcl mobile

## Install

```bash
npm install bcl-mobile-overlay
npx cap sync
```

## API

<docgen-index>

* [`disconnect()`](#disconnect)
* [`showTalking(...)`](#showtalking)
* [`showNotification(...)`](#shownotification)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### disconnect()

```typescript
disconnect() => Promise<{ value: string; }>
```

**Returns:** <code>Promise&lt;{ value: string; }&gt;</code>

--------------------


### showTalking(...)

```typescript
showTalking(options: { color: number; talking: boolean; }) => Promise<{ value: string; }>
```

| Param         | Type                                              |
| ------------- | ------------------------------------------------- |
| **`options`** | <code>{ color: number; talking: boolean; }</code> |

**Returns:** <code>Promise&lt;{ value: string; }&gt;</code>

--------------------


### showNotification(...)

```typescript
showNotification(options: { audiomuted: boolean; micmuted: boolean; overlayEnabled: boolean; }) => Promise<{ value: string; }>
```

| Param         | Type                                                                              |
| ------------- | --------------------------------------------------------------------------------- |
| **`options`** | <code>{ audiomuted: boolean; micmuted: boolean; overlayEnabled: boolean; }</code> |

**Returns:** <code>Promise&lt;{ value: string; }&gt;</code>

--------------------

</docgen-api>
