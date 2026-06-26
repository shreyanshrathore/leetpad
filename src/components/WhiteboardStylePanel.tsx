import { useCallback } from 'react'
import {
  ArrowShapeArrowheadEndStyle,
  ArrowShapeArrowheadStartStyle,
  ArrowShapeKindStyle,
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  DefaultFontStyle,
  DefaultSizeStyle,
  DefaultStylePanel,
  GeoShapeGeoStyle,
  GeoStylePickerSet,
  getDefaultColorTheme,
  kickoutOccludedShapes,
  LineShapeSplineStyle,
  OpacitySlider,
  TextStylePickerSet,
  TldrawUiButtonPicker,
  TldrawUiToolbar,
  useEditor,
  useIsDarkMode,
  useRelevantStyles,
  useTranslation,
  type StyleProp,
  type TLUiStylePanelProps,
} from 'tldraw'
import { WHITEBOARD_COLOR_ITEMS } from '../lib/whiteboardColorItems'

const FILL_ITEMS = [
  { value: 'none', icon: 'fill-none' },
  { value: 'semi', icon: 'fill-semi' },
  { value: 'solid', icon: 'fill-solid' },
  { value: 'pattern', icon: 'fill-pattern' },
] as const

const DASH_ITEMS = [
  { value: 'draw', icon: 'dash-draw' },
  { value: 'dashed', icon: 'dash-dashed' },
  { value: 'dotted', icon: 'dash-dotted' },
  { value: 'solid', icon: 'dash-solid' },
] as const

const SIZE_ITEMS = [
  { value: 's', icon: 'size-small' },
  { value: 'm', icon: 'size-medium' },
  { value: 'l', icon: 'size-large' },
  { value: 'xl', icon: 'size-extra-large' },
] as const

function useStyleChangeCallback() {
  const editor = useEditor()

  return useCallback(
    <T,>(style: StyleProp<T>, value: T) => {
      editor.run(() => {
        if (editor.isIn('select')) {
          editor.setStyleForSelectedShapes(style, value)
        }
        editor.setStyleForNextShapes(style, value)
        editor.updateInstanceState({ isChangingStyle: true })
      })
    },
    [editor],
  )
}

function WhiteboardCommonStylePickerSet({
  styles,
  theme,
}: {
  readonly styles: NonNullable<ReturnType<typeof useRelevantStyles>>
  readonly theme: ReturnType<typeof getDefaultColorTheme>
}) {
  const msg = useTranslation()
  const editor = useEditor()
  const onHistoryMark = useCallback(
    (id: string) => editor.markHistoryStoppingPoint(id),
    [editor],
  )
  const handleValueChange = useStyleChangeCallback()

  const color = styles.get(DefaultColorStyle)
  const fill = styles.get(DefaultFillStyle)
  const dash = styles.get(DefaultDashStyle)
  const size = styles.get(DefaultSizeStyle)
  const showPickers = fill !== undefined || dash !== undefined || size !== undefined

  return (
    <>
      <div className="tlui-style-panel__section__common" data-testid="style.panel">
        {color === undefined ? null : (
          <TldrawUiToolbar label={msg('style-panel.color')}>
            <TldrawUiButtonPicker
              title={msg('style-panel.color')}
              uiType="color"
              style={DefaultColorStyle}
              items={WHITEBOARD_COLOR_ITEMS}
              value={color}
              onValueChange={handleValueChange}
              theme={theme}
              onHistoryMark={onHistoryMark}
            />
          </TldrawUiToolbar>
        )}
        <OpacitySlider />
      </div>

      {showPickers ? (
        <div className="tlui-style-panel__section">
          {fill === undefined ? null : (
            <TldrawUiToolbar label={msg('style-panel.fill')}>
              <TldrawUiButtonPicker
                title={msg('style-panel.fill')}
                uiType="fill"
                style={DefaultFillStyle}
                items={FILL_ITEMS}
                value={fill}
                onValueChange={handleValueChange}
                theme={theme}
                onHistoryMark={onHistoryMark}
              />
            </TldrawUiToolbar>
          )}
          {dash === undefined ? null : (
            <TldrawUiToolbar label={msg('style-panel.dash')}>
              <TldrawUiButtonPicker
                title={msg('style-panel.dash')}
                uiType="dash"
                style={DefaultDashStyle}
                items={DASH_ITEMS}
                value={dash}
                onValueChange={handleValueChange}
                theme={theme}
                onHistoryMark={onHistoryMark}
              />
            </TldrawUiToolbar>
          )}
          {size === undefined ? null : (
            <TldrawUiToolbar label={msg('style-panel.size')}>
              <TldrawUiButtonPicker
                title={msg('style-panel.size')}
                uiType="size"
                style={DefaultSizeStyle}
                items={SIZE_ITEMS}
                value={size}
                onValueChange={(style, value) => {
                  handleValueChange(style, value)
                  const selectedShapeIds = editor.getSelectedShapeIds()
                  if (selectedShapeIds.length > 0) {
                    kickoutOccludedShapes(editor, selectedShapeIds)
                  }
                }}
                theme={theme}
                onHistoryMark={onHistoryMark}
              />
            </TldrawUiToolbar>
          )}
        </div>
      ) : null}
    </>
  )
}

function WhiteboardStylePanelContent() {
  const isDarkMode = useIsDarkMode()
  const styles = useRelevantStyles()

  if (!styles) return null

  const geo = styles.get(GeoShapeGeoStyle)
  const arrowheadEnd = styles.get(ArrowShapeArrowheadEndStyle)
  const arrowheadStart = styles.get(ArrowShapeArrowheadStartStyle)
  const arrowKind = styles.get(ArrowShapeKindStyle)
  const spline = styles.get(LineShapeSplineStyle)
  const font = styles.get(DefaultFontStyle)

  const hideGeo = geo === undefined
  const hideArrowHeads = arrowheadEnd === undefined && arrowheadStart === undefined
  const hideSpline = spline === undefined
  const hideArrowKind = arrowKind === undefined
  const hideText = font === undefined

  const theme = getDefaultColorTheme({ isDarkMode })

  return (
    <>
      <WhiteboardCommonStylePickerSet theme={theme} styles={styles} />
      {!hideText ? <TextStylePickerSet theme={theme} styles={styles} /> : null}
      {hideGeo && hideArrowHeads && hideSpline && hideArrowKind ? null : (
        <div className="tlui-style-panel__section">
          <GeoStylePickerSet styles={styles} />
        </div>
      )}
    </>
  )
}

export function WhiteboardStylePanel(props: TLUiStylePanelProps) {
  return (
    <DefaultStylePanel {...props}>
      <WhiteboardStylePanelContent />
    </DefaultStylePanel>
  )
}
