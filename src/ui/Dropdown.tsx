import * as Select from '@radix-ui/react-select'

type Option = { value: string; label: string }
type Props = {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  fullWidth?: boolean
  theme: 'dark' | 'light'
}

export function Dropdown({ label, value, options, onChange, fullWidth = false, theme }: Props) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className={'dropdown-trigger' + (fullWidth ? ' dropdown-wide' : '')} aria-label={label}>
        <Select.Value />
        <Select.Icon className="dropdown-chevron" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={'dropdown-content ' + theme} position="popper" sideOffset={6} collisionPadding={12}>
          <Select.Viewport className="dropdown-viewport">
            {options.map(option => (
              <Select.Item className="dropdown-item" key={option.value} value={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="dropdown-check">
                  <svg width="14" height="14" viewBox="0 0 16 16"><path d="m3 8.5 3.2 3.2L13 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
