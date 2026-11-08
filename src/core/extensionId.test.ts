import { describe, expect, it } from 'vitest'
import { extensionIdFor } from '../../e2e/extension-fixture'

// Chrome maps the first 32 hex chars of sha256(path) from 0-f to a-p.
describe('extensionIdFor', () => {
  it('hashes POSIX paths as UTF-8', () => {
    expect(extensionIdFor('/tmp/example/dist', 'linux')).toBe('ellenakkknjnaciddhokeelnnmnabbml')
    expect(extensionIdFor('/tmp/example/dist', 'darwin')).toBe('ellenakkknjnaciddhokeelnnmnabbml')
  })

  it('hashes Windows paths as UTF-16LE and upper-cases the drive letter', () => {
    expect(extensionIdFor('D:\\a\\promptab\\promptab\\dist', 'win32')).toBe('doacfmbgodpeikapgkngmgajgpndipfd')
    expect(extensionIdFor('d:\\a\\promptab\\promptab\\dist', 'win32')).toBe('doacfmbgodpeikapgkngmgajgpndipfd')
  })

  it('does not produce the UTF-8 id that broke the Windows CI job', () => {
    // jpgpoaejcfbmaboiofhmmnidgjmbonep is sha256 of the same path as UTF-8.
    expect(extensionIdFor('D:\\a\\promptab\\promptab\\dist', 'win32')).not.toBe('jpgpoaejcfbmaboiofhmmnidgjmbonep')
  })
})
