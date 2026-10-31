import { Check, ChevronDown } from 'lucide-react'
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
          <ChevronDown size={16} strokeWidth={1.5} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={'dropdown-content ' + theme} position="popper" sideOffset={6} collisionPadding={12}>
          <Select.Viewport className="dropdown-viewport">
            {options.map(option => (
              <Select.Item className="dropdown-item" key={option.value} value={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="dropdown-check">
                  <Check size={16} strokeWidth={1.5} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
